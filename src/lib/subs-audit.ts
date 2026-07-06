import { stripe } from "@/lib/stripe";
import {
  getAllApplications,
  getAllPagos,
  type PostulacionRecord,
  type PagoRecord,
} from "@/lib/airtable";

/**
 * Auditoría de suscripciones — cruza el estado en Airtable (Postulaciones + Pagos)
 * contra el estado real en Stripe (subs, facturas, tarjeta) para cada founder
 * inscrito, y clasifica anomalías.
 *
 * Sensor de la métrica MAA: "# de founders con estado de suscripción correcto".
 * Nace de la auditoría del 2026-07-06 (WI-1823) que encontró 4 morosos sin
 * cobrar, 1 doble suscripción (Ciudata) y total_cuotas vacío en 13 subs.
 *
 * Read-only: NO escribe en Stripe ni Airtable. Solo diagnostica.
 */

export type SubFlag =
  | "DOBLE_SUB" // más de una suscripción activa en Stripe (cobro doble)
  | "MOROSA" // sub past_due / unpaid — cobro no ejecutado
  | "FACTURA_OPEN" // factura abierta (aún no vencida) — vigilar
  | "SIN_SUB_ACTIVA" // "pagó" en Airtable pero no hay sub activa en Stripe
  | "SIN_STRIPE" // "pagó" en Airtable pero el customer no existe en Stripe
  | "TOTAL_CUOTAS_VACIO"; // total_cuotas vacío → sistema asume 3 (riesgo planes de 4)

export interface SubAuditRow {
  postulacionId: string;
  startup: string;
  email: string;
  status: string;
  paymentStatus: string;
  totalCuotas: number | null; // null = vacío en Airtable (el sistema asume 3)
  cuotasPagadas: number; // registros en la tabla Pagos para ese email
  subsActivas: number; // subs active/trialing en Stripe
  subsStripe: string[]; // resumen "sub_xxx[status]"
  subStatusMoroso: string; // "past_due" | "unpaid" | ""
  tieneTarjeta: boolean; // hay payment method card guardado
  motivoFallo: string; // razón del último cobro fallido (Stripe), "" si no aplica
  ultimoIntento: string; // fecha ISO del último intento de cobro fallido, "" si no aplica
  esBeca: boolean;
  flags: SubFlag[];
}

const PAGADO_STATUSES = new Set([
  "Cuota 1 pagada",
  "Cuota 2 pagada",
  "Cuota 3 pagada",
]);

// Estados de postulación que representan a un founder inscrito con acceso al
// portal (los únicos que tienen sentido auditar por suscripción).
const INSCRITO_STATUSES = new Set(["Inscrita", "Invitada institucional"]);

interface StripeState {
  subsActivas: number;
  subsStripe: string[];
  subStatusMoroso: string;
  facturaOpen: boolean;
  tieneTarjeta: boolean;
  customerExiste: boolean;
  motivoFallo: string;
  ultimoIntento: string;
}

// Traduce los decline_code / motivos de Stripe a algo legible para el admin.
// https://stripe.com/docs/declines/codes
const DECLINE_ES: Record<string, string> = {
  insufficient_funds: "Fondos insuficientes",
  card_declined: "Tarjeta rechazada por el banco",
  expired_card: "Tarjeta vencida",
  incorrect_cvc: "CVC incorrecto",
  processing_error: "Error de procesamiento del banco",
  authentication_required: "Requiere autenticación (3D Secure) sin completar",
  do_not_honor: "Banco rechazó el cobro (do not honor)",
  generic_decline: "Rechazo genérico del banco",
  lost_card: "Tarjeta reportada como perdida",
  stolen_card: "Tarjeta reportada como robada",
  card_velocity_exceeded: "Límite de intentos de la tarjeta excedido",
};

function motivoLegible(declineCode?: string | null, message?: string | null): string {
  if (declineCode && DECLINE_ES[declineCode]) return DECLINE_ES[declineCode];
  if (declineCode) return declineCode.replace(/_/g, " ");
  if (message) return message;
  return "Cobro no ejecutado (sin detalle de Stripe)";
}

// Consulta el estado real de un founder en Stripe por email. Degrada a un
// estado vacío si Stripe falla, para no romper el panel completo por un founder.
async function fetchStripeState(email: string): Promise<StripeState> {
  const out: StripeState = {
    subsActivas: 0,
    subsStripe: [],
    subStatusMoroso: "",
    facturaOpen: false,
    tieneTarjeta: false,
    customerExiste: false,
    motivoFallo: "",
    ultimoIntento: "",
  };
  try {
    const custs = await stripe.customers.list({ email, limit: 3 });
    for (const c of custs.data) {
      out.customerExiste = true;
      const subs = await stripe.subscriptions.list({
        customer: c.id,
        status: "all",
        limit: 10,
      });
      for (const s of subs.data) {
        out.subsStripe.push(`${s.id}[${s.status}]`);
        if (s.status === "active" || s.status === "trialing") out.subsActivas++;
        if (s.status === "past_due" || s.status === "unpaid") {
          out.subStatusMoroso = s.status;
        }
      }
      const invs = await stripe.invoices.list({ customer: c.id, limit: 12 });
      if (invs.data.some((i) => i.status === "open")) out.facturaOpen = true;

      // Si hay morosidad, leer el motivo del último cobro fallido. En Stripe 22
      // el Invoice ya no expone payment_intent; el detalle del rechazo vive en
      // el charge fallido (failure_code / outcome.seller_message), estable
      // entre versiones. Tomamos el charge failed más reciente del customer.
      if (out.subStatusMoroso && !out.motivoFallo) {
        const charges = await stripe.charges
          .list({ customer: c.id, limit: 10 })
          .catch(() => null);
        const failed = charges?.data
          .filter((ch) => ch.status === "failed")
          .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];
        if (failed) {
          out.ultimoIntento = new Date(
            (failed.created ?? 0) * 1000,
          ).toISOString();
          out.motivoFallo = motivoLegible(
            failed.failure_code,
            failed.outcome?.seller_message ?? failed.failure_message,
          );
        }
      }

      const pms = await stripe.paymentMethods.list({
        customer: c.id,
        type: "card",
        limit: 3,
      });
      if (pms.data.length) out.tieneTarjeta = true;
    }
  } catch {
    out.subsStripe.push("ERROR_STRIPE");
  }
  return out;
}

// Clasifica las anomalías de un founder combinando Airtable + Stripe.
function classifyFlags(
  paymentStatus: string,
  totalCuotas: number | null,
  hasSubField: boolean,
  esBeca: boolean,
  st: StripeState,
): SubFlag[] {
  const flags: SubFlag[] = [];
  if (st.subsActivas > 1) flags.push("DOBLE_SUB");
  if (st.subStatusMoroso) flags.push("MOROSA");
  if (st.facturaOpen && !st.subStatusMoroso) flags.push("FACTURA_OPEN");

  const haPagado = PAGADO_STATUSES.has(paymentStatus);
  if (!esBeca && haPagado) {
    if (!st.customerExiste && !hasSubField) {
      flags.push("SIN_STRIPE");
    } else if (st.subsActivas === 0 && !st.subStatusMoroso) {
      flags.push("SIN_SUB_ACTIVA");
    }
  }

  // total_cuotas vacío solo importa cuando hay una suscripción de por medio.
  if (totalCuotas == null && hasSubField) flags.push("TOTAL_CUOTAS_VACIO");
  return flags;
}

/**
 * Ejecuta la auditoría completa. Devuelve una fila por founder inscrito,
 * ordenada con las anomalías primero.
 */
export async function runSubsAudit(): Promise<SubAuditRow[]> {
  const [apps, pagos]: [PostulacionRecord[], PagoRecord[]] = await Promise.all([
    getAllApplications(),
    getAllPagos().catch(() => [] as PagoRecord[]),
  ]);

  // # de pagos registrados por email (Airtable)
  const pagosByEmail = new Map<string, number>();
  for (const p of pagos) {
    const e = (p.email ?? "").toLowerCase();
    if (!e) continue;
    pagosByEmail.set(e, (pagosByEmail.get(e) ?? 0) + 1);
  }

  const inscritos = apps.filter(
    (a) => a.status && INSCRITO_STATUSES.has(a.status) && a.email,
  );

  const rows = await Promise.all(
    inscritos.map(async (app): Promise<SubAuditRow> => {
      const email = (app.email ?? "").toLowerCase();
      const paymentStatus = app.payment_status ?? "";
      const esBeca =
        paymentStatus === "Beca 100%" || app.discount_percent === 100;
      const totalCuotas =
        typeof app.total_cuotas === "number" ? app.total_cuotas : null;
      const hasSubField = !!app.stripe_subscription_id;

      const st = await fetchStripeState(email);
      const flags = classifyFlags(
        paymentStatus,
        totalCuotas,
        hasSubField,
        esBeca,
        st,
      );

      return {
        postulacionId: app.id ?? "",
        startup: app.startup_name || email.split("@")[0],
        email,
        status: app.status ?? "",
        paymentStatus,
        totalCuotas,
        cuotasPagadas: pagosByEmail.get(email) ?? 0,
        subsActivas: st.subsActivas,
        subsStripe: st.subsStripe,
        subStatusMoroso: st.subStatusMoroso,
        tieneTarjeta: st.tieneTarjeta,
        motivoFallo: st.motivoFallo,
        ultimoIntento: st.ultimoIntento,
        esBeca,
        flags,
      };
    }),
  );

  // Anomalías primero, luego alfabético por startup.
  return rows.sort(
    (a, b) =>
      b.flags.length - a.flags.length || a.startup.localeCompare(b.startup),
  );
}

// Severidad para ordenar/colorear: rojo > naranja > amarillo.
export function flagSeverity(flag: SubFlag): "red" | "orange" | "yellow" {
  if (flag === "DOBLE_SUB" || flag === "MOROSA" || flag === "SIN_STRIPE")
    return "red";
  if (flag === "FACTURA_OPEN") return "orange";
  return "yellow";
}

export const FLAG_LABEL: Record<SubFlag, string> = {
  DOBLE_SUB: "Doble suscripción",
  MOROSA: "Morosa",
  FACTURA_OPEN: "Factura abierta",
  SIN_SUB_ACTIVA: "Sin sub activa",
  SIN_STRIPE: "Sin Stripe",
  TOTAL_CUOTAS_VACIO: "Cuotas sin definir",
};

// Acción sugerida para el admin, por flag.
export const FLAG_ACCION: Record<SubFlag, string> = {
  DOBLE_SUB:
    "Cancelar la suscripción duplicada en Stripe y reembolsar el cobro extra.",
  MOROSA:
    "Cobro atrasado. Si tiene tarjeta guardada, correr el cron sub-health o cobrar la factura manualmente en Stripe.",
  FACTURA_OPEN: "Factura emitida, aún no vence. Vigilar que se cobre.",
  SIN_SUB_ACTIVA:
    "Verificar: puede ser pago único (ok) o una sub cancelada. Confirmar contra Stripe.",
  SIN_STRIPE:
    "Pago registrado en Airtable pero el founder no existe en Stripe. Revisar si fue pago externo o error.",
  TOTAL_CUOTAS_VACIO:
    "Llenar total_cuotas en la Postulación. Vacío = el sistema asume 3; los planes de 4 se cancelan una cuota antes.",
};

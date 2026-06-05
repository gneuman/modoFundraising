export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAllApplications, updateApplicationStatus, type PostulacionRecord } from "@/lib/airtable";
import { stripe } from "@/lib/stripe";

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const ADMIN_ALERT_TO = process.env.ADMIN_ALERT_EMAIL ?? "admin@impacta.vc";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

/**
 * /api/cron/sub-health
 *
 * Red de seguridad para suscripciones Stripe que NO pasan por el flujo normal
 * de webhook. Caso típico: subs creadas a mano en Stripe en modo
 * collection_method=send_invoice — Stripe emite factura pero NO intenta cobrar
 * tarjeta, así que nunca dispara invoice.payment_failed y el cron de cobranza
 * existente no se entera.
 *
 * Acciones por suscripción:
 *  1. past_due / unpaid sin payment_failed_at → marcar payment_failed_at
 *     (eso hace que el cron /cobranza arranque los recordatorios).
 *  2. facturas open con attempts=0 → intentar pay() si hay tarjeta default.
 *     Si funciona, queda resuelto. Si falla o no hay tarjeta, marcar
 *     payment_failed_at para entrar al flujo de cobranza.
 *  3. subs con más facturas pagadas que total_cuotas (sobre-cobro potencial)
 *     → alertar al admin por email (no auto-cancelar).
 *
 *  GET  → preview (qué haría sin ejecutar)
 *  POST → ejecutar
 *
 * Auth: Bearer <CRON_SECRET>
 */

type Accion =
  | { tipo: "marcado_failed"; razon: string }
  | { tipo: "cobrado"; invoiceId: string; monto: number }
  | { tipo: "cobro_fallo_marcado_failed"; invoiceId: string; error: string }
  | { tipo: "sin_tarjeta_marcado_failed"; invoiceId: string }
  | { tipo: "alerta_sobrecobro"; pagadas: number; total: number; subId: string }
  | { tipo: "skip"; razon: string };

type ResultadoFila = {
  airtableId: string;
  startup: string;
  email: string;
  subId: string | null;
  subStatus: string | null;
  acciones: Accion[];
};

async function getDefaultCard(customerId: string): Promise<string | null> {
  try {
    const c = await stripe.customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    if ("deleted" in c) return null;
    const pm = c.invoice_settings?.default_payment_method;
    if (pm && typeof pm !== "string" && pm.id) return pm.id;
    // Fallback: primer payment_method de tipo card
    const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 5 });
    return pms.data[0]?.id ?? null;
  } catch { return null; }
}

async function procesarApp(app: PostulacionRecord, dryRun: boolean): Promise<ResultadoFila> {
  const out: ResultadoFila = {
    airtableId: app.id!,
    startup: app.startup_name ?? "",
    email: app.email ?? "",
    subId: null,
    subStatus: null,
    acciones: [],
  };

  if (!app.email) { out.acciones.push({ tipo: "skip", razon: "sin email" }); return out; }

  // Resolver customer
  let customerId = app.stripe_customer_id ?? null;
  if (!customerId) {
    const list = await stripe.customers.list({ email: app.email, limit: 3 });
    customerId = list.data[0]?.id ?? null;
  }
  if (!customerId) { out.acciones.push({ tipo: "skip", razon: "sin customer Stripe" }); return out; }

  // Buscar sub problemática o la primera no cancelada
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
  const sub = subs.data.find((s) => ["past_due", "unpaid", "incomplete"].includes(s.status))
    ?? subs.data.find((s) => s.status === "active")
    ?? subs.data[0]
    ?? null;
  if (sub) { out.subId = sub.id; out.subStatus = sub.status; }

  // Facturas
  const invs = await stripe.invoices.list({ customer: customerId, limit: 24 });
  const facturasPagadas = invs.data.filter((i) => i.status === "paid").length;
  const total = app.total_cuotas ?? 3;

  // 3. Alerta sobre-cobro
  if (facturasPagadas > total && sub && sub.status !== "canceled") {
    out.acciones.push({ tipo: "alerta_sobrecobro", pagadas: facturasPagadas, total, subId: sub.id });
    // (no return: igual procesar facturas pendientes si las hubiera)
  }

  // 1. past_due/unpaid sin payment_failed_at → marcar
  if (sub && ["past_due", "unpaid"].includes(sub.status) && !app.payment_failed_at) {
    if (!dryRun) {
      await updateApplicationStatus(app.id!, app.status!, {
        payment_failed_at: new Date().toISOString(),
      });
    }
    out.acciones.push({ tipo: "marcado_failed", razon: `sub.status=${sub.status} sin payment_failed_at` });
    return out;
  }

  // 2. Facturas open con attempts=0 (caso send_invoice) → intentar cobrar
  const openSinCobro = invs.data.find((i) => i.status === "open" && (i.attempt_count ?? 0) === 0);
  if (openSinCobro) {
    const cardId = await getDefaultCard(customerId);
    if (!cardId) {
      // Sin tarjeta → marcar failed para que entre al flujo de cobranza
      if (!app.payment_failed_at && !dryRun) {
        await updateApplicationStatus(app.id!, app.status!, {
          payment_failed_at: new Date().toISOString(),
        });
      }
      out.acciones.push({ tipo: "sin_tarjeta_marcado_failed", invoiceId: openSinCobro.id! });
      return out;
    }
    // Hay tarjeta → intentar pay()
    if (dryRun) {
      out.acciones.push({ tipo: "cobrado", invoiceId: openSinCobro.id!, monto: (openSinCobro.amount_due ?? 0) / 100 });
      return out;
    }
    try {
      const paid = await stripe.invoices.pay(openSinCobro.id!, { payment_method: cardId });
      out.acciones.push({ tipo: "cobrado", invoiceId: paid.id!, monto: (paid.amount_paid ?? 0) / 100 });
      // El webhook invoice.payment_succeeded actualizará Airtable automáticamente
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!app.payment_failed_at) {
        await updateApplicationStatus(app.id!, app.status!, {
          payment_failed_at: new Date().toISOString(),
        });
      }
      out.acciones.push({ tipo: "cobro_fallo_marcado_failed", invoiceId: openSinCobro.id!, error: msg });
    }
    return out;
  }

  if (out.acciones.length === 0) out.acciones.push({ tipo: "skip", razon: "todo OK" });
  return out;
}

function buildAlertHtml(rows: ResultadoFila[]): string {
  const alertas = rows.filter((r) => r.acciones.some((a) => a.tipo === "alerta_sobrecobro"));
  if (alertas.length === 0) return "";
  const items = alertas.map((r) => {
    const alerta = r.acciones.find((a) => a.tipo === "alerta_sobrecobro") as Extract<Accion, { tipo: "alerta_sobrecobro" }>;
    return `<li><b>${r.startup}</b> &lt;${r.email}&gt;: ${alerta.pagadas} facturas pagadas vs ${alerta.total} cuotas planeadas (sub ${alerta.subId}, status=${r.subStatus})</li>`;
  }).join("");
  return `
    <h2>⚠ Sobre-cobro detectado en Stripe</h2>
    <p>Las siguientes suscripciones tienen más facturas pagadas que cuotas configuradas. Revisá si hay error en total_cuotas o si hay que cancelar la sub para evitar más cobros.</p>
    <ul>${items}</ul>
    <p><a href="${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/admin/revenue">Abrir admin/revenue</a></p>
  `;
}

async function notificarAdmin(rows: ResultadoFila[]) {
  const html = buildAlertHtml(rows);
  if (!html) return;
  // Lazy import para no cargar googleapis si no hace falta
  const { google } = await import("googleapis");
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  const gmail = google.gmail({ version: "v1", auth });
  const subject = "⚠ MF26 — Sobre-cobro detectado en suscripciones Stripe";
  const encoded = /[^\x00-\x7F]/.test(subject)
    ? `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`
    : subject;
  const message = [
    `From: ${process.env.GMAIL_FROM ?? "Modo Fundraising <admin@impacta.vc>"}`,
    `To: ${ADMIN_ALERT_TO}`,
    `Subject: ${encoded}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\r\n");
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: Buffer.from(message).toString("base64url") },
  });
}

async function run(dryRun: boolean) {
  const apps = await getAllApplications();
  const target = apps.filter((a) =>
    (a.status === "Inscrita" || a.status === "Invitada institucional")
    && a.payment_status !== "Beca 100%"
    && a.discount_percent !== 100
  );

  const rows: ResultadoFila[] = [];
  for (const app of target) {
    try {
      rows.push(await procesarApp(app, dryRun));
    } catch (err) {
      rows.push({
        airtableId: app.id!,
        startup: app.startup_name ?? "",
        email: app.email ?? "",
        subId: null,
        subStatus: null,
        acciones: [{ tipo: "skip", razon: `error: ${err instanceof Error ? err.message : String(err)}` }],
      });
    }
  }

  // Notificar admin si hay sobre-cobros (solo en ejecución real)
  if (!dryRun) {
    try { await notificarAdmin(rows); }
    catch (err) { console.error("[sub-health] notificarAdmin falló:", err); }
  }

  // Resumen
  const counts: Record<string, number> = {};
  for (const r of rows) for (const a of r.acciones) counts[a.tipo] = (counts[a.tipo] ?? 0) + 1;

  const conAccion = rows.filter((r) => r.acciones.some((a) => a.tipo !== "skip"));

  return {
    dryRun,
    scanned: rows.length,
    actions: counts,
    rows: conAccion,
  };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await run(true));
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await run(false));
}

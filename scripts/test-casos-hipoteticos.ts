/**
 * Tests de la lógica decidirAccion con casos hipotéticos.
 * Valida que cualquier combinación futura caiga en la categoría correcta.
 */
type Decision = "ok_auto" | "billing_portal" | "checkout" | "completado" | "sin_email" | "revisar" | "beca";

interface App {
  email?: string;
  payment_status?: string;
  discount_percent?: number;
  total_cuotas?: number;
}
interface Stripe { subStatus: string | null; subId: string | null; facturasPagadas: number; facturasAbiertas: number; }

function decidir(app: App, s: Stripe, pagadasAirtable: number): Decision {
  if (!app.email) return "sin_email";
  if (app.payment_status === "Beca 100%" || app.discount_percent === 100) return "beca";
  let total: number;
  if (typeof app.total_cuotas === "number" && app.total_cuotas > 0) {
    total = app.total_cuotas;
  } else {
    const sinSubActiva = !s.subId || s.subStatus === "canceled";
    const unicoPago = (pagadasAirtable === 1 || s.facturasPagadas === 1);
    total = sinSubActiva && unicoPago ? 1 : 3;
  }
  const pagadas = Math.max(s.facturasPagadas, pagadasAirtable);
  if (pagadas >= total) return "completado";
  if (s.subStatus === "past_due" || s.subStatus === "unpaid") return "billing_portal";
  if (s.subStatus === "incomplete") return "billing_portal";
  if (s.subStatus === "active") return "ok_auto";
  if (s.subStatus === "canceled") return "checkout";
  if (!s.subId && pagadas === 0) return "checkout";
  if (!s.subId && pagadas > 0) return "checkout";
  return "revisar";
}

interface Test { nombre: string; app: App; s: Stripe; pagAT: number; esperado: Decision; }

const tests: Test[] = [
  // ── Casos típicos que NO deben aparecer en "problema" ──────────────────
  { nombre: "Pago único 1/1 completado, sin sub Stripe",
    app: { email: "a@x.com", total_cuotas: 1 },
    s: { subStatus: null, subId: null, facturasPagadas: 0, facturasAbiertas: 0 }, pagAT: 1,
    esperado: "completado" },

  { nombre: "Pago único 1/1, pagó por Stripe sub canceled",
    app: { email: "a@x.com", total_cuotas: 1 },
    s: { subStatus: "canceled", subId: "sub_x", facturasPagadas: 1, facturasAbiertas: 0 }, pagAT: 0,
    esperado: "completado" },

  { nombre: "3/3 con sub cancelada (caso normal de fin de plan)",
    app: { email: "a@x.com", total_cuotas: 3 },
    s: { subStatus: "canceled", subId: "sub_x", facturasPagadas: 3, facturasAbiertas: 0 }, pagAT: 0,
    esperado: "completado" },

  { nombre: "4/4 con sub activa todavía (sin cancelar webhook)",
    app: { email: "a@x.com", total_cuotas: 4 },
    s: { subStatus: "active", subId: "sub_x", facturasPagadas: 4, facturasAbiertas: 0 }, pagAT: 0,
    esperado: "completado" },

  { nombre: "Beca 100%, sin pagos",
    app: { email: "a@x.com", payment_status: "Beca 100%" },
    s: { subStatus: null, subId: null, facturasPagadas: 0, facturasAbiertas: 0 }, pagAT: 0,
    esperado: "beca" },

  { nombre: "Beca por discount=100, payment_status undefined",
    app: { email: "a@x.com", discount_percent: 100 },
    s: { subStatus: null, subId: null, facturasPagadas: 0, facturasAbiertas: 0 }, pagAT: 0,
    esperado: "beca" },

  { nombre: "Pagó por transferencia (Pagos MF26) sin Stripe — pago único",
    app: { email: "a@x.com", total_cuotas: 1 },
    s: { subStatus: null, subId: null, facturasPagadas: 0, facturasAbiertas: 0 }, pagAT: 1,
    esperado: "completado" },

  { nombre: "Sobre-cobro: 4 pagadas, total=3",
    app: { email: "a@x.com", total_cuotas: 3 },
    s: { subStatus: "canceled", subId: "sub_x", facturasPagadas: 4, facturasAbiertas: 0 }, pagAT: 0,
    esperado: "completado" },

  // ── Casos que SÍ requieren acción ──────────────────────────────────────
  { nombre: "Tarjeta falló: sub past_due",
    app: { email: "a@x.com", total_cuotas: 3 },
    s: { subStatus: "past_due", subId: "sub_x", facturasPagadas: 1, facturasAbiertas: 1 }, pagAT: 0,
    esperado: "billing_portal" },

  { nombre: "Sub unpaid",
    app: { email: "a@x.com", total_cuotas: 3 },
    s: { subStatus: "unpaid", subId: "sub_x", facturasPagadas: 1, facturasAbiertas: 1 }, pagAT: 0,
    esperado: "billing_portal" },

  { nombre: "Sub incomplete",
    app: { email: "a@x.com", total_cuotas: 3 },
    s: { subStatus: "incomplete", subId: "sub_x", facturasPagadas: 0, facturasAbiertas: 1 }, pagAT: 0,
    esperado: "billing_portal" },

  { nombre: "Sub cancelada con cuotas faltantes",
    app: { email: "a@x.com", total_cuotas: 3 },
    s: { subStatus: "canceled", subId: "sub_x", facturasPagadas: 1, facturasAbiertas: 0 }, pagAT: 0,
    esperado: "checkout" },

  { nombre: "Sin sub Stripe ni pagos: nuevo Checkout",
    app: { email: "a@x.com", total_cuotas: 3 },
    s: { subStatus: null, subId: null, facturasPagadas: 0, facturasAbiertas: 0 }, pagAT: 0,
    esperado: "checkout" },

  { nombre: "Pagos por fuera, sin sub, faltan cuotas",
    app: { email: "a@x.com", total_cuotas: 4 },
    s: { subStatus: null, subId: null, facturasPagadas: 0, facturasAbiertas: 0 }, pagAT: 2,
    esperado: "checkout" },

  { nombre: "Sub activa con factura en curso (no es problema)",
    app: { email: "a@x.com", total_cuotas: 4 },
    s: { subStatus: "active", subId: "sub_x", facturasPagadas: 2, facturasAbiertas: 1 }, pagAT: 0,
    esperado: "ok_auto" },

  // ── Casos edge raros ───────────────────────────────────────────────────
  { nombre: "Sin email (no debería pasar pero por seguridad)",
    app: { total_cuotas: 3 },
    s: { subStatus: null, subId: null, facturasPagadas: 0, facturasAbiertas: 0 }, pagAT: 0,
    esperado: "sin_email" },

  { nombre: "total_cuotas undefined + 3 pagos (asume 3, completo)",
    app: { email: "a@x.com" },
    s: { subStatus: null, subId: null, facturasPagadas: 3, facturasAbiertas: 0 }, pagAT: 0,
    esperado: "completado" },

  { nombre: "total_cuotas undefined + 1 pago Stripe + sin sub (caso Zavia post-fix)",
    app: { email: "a@x.com" },
    s: { subStatus: null, subId: null, facturasPagadas: 1, facturasAbiertas: 0 }, pagAT: 0,
    esperado: "completado" },

  { nombre: "total_cuotas undefined + 1 pago en Airtable + sin sub",
    app: { email: "a@x.com" },
    s: { subStatus: null, subId: null, facturasPagadas: 0, facturasAbiertas: 0 }, pagAT: 1,
    esperado: "completado" },

  { nombre: "total_cuotas undefined + 1 pago + sub canceled (LEAF caso)",
    app: { email: "a@x.com" },
    s: { subStatus: "canceled", subId: "sub_x", facturasPagadas: 1, facturasAbiertas: 0 }, pagAT: 1,
    esperado: "completado" },

  { nombre: "total_cuotas undefined + 2 pagos en Airtable + sin sub (ambiguo → asume 3)",
    app: { email: "a@x.com" },
    s: { subStatus: null, subId: null, facturasPagadas: 0, facturasAbiertas: 0 }, pagAT: 2,
    esperado: "checkout" }, // 2 pagos + total=3 → faltan 1, todavía requiere acción

  { nombre: "total_cuotas undefined + sub activa con 1 pago (no asumir pago único, esperar)",
    app: { email: "a@x.com" },
    s: { subStatus: "active", subId: "sub_x", facturasPagadas: 1, facturasAbiertas: 0 }, pagAT: 0,
    esperado: "ok_auto" }, // tiene sub viva → no es pago único
];

let pass = 0, fail = 0;
console.log();
for (const t of tests) {
  const got = decidir(t.app, t.s, t.pagAT);
  const ok = got === t.esperado;
  console.log(`${ok ? "✅" : "❌"} ${t.nombre}`);
  if (!ok) console.log(`   esperaba ${t.esperado}, obtuvo ${got}`);
  ok ? pass++ : fail++;
}
console.log(`\n${pass}/${tests.length} pasan${fail > 0 ? ` · ❌ ${fail} fallan` : ""}\n`);

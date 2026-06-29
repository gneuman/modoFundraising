/**
 * Auditoría READ-ONLY: cruza las 8 startups con pagos negociados a mano
 * (ver scripts/reconcile-pagos-mf26.ts) contra Stripe para saber a cuáles
 * hay que retomarles el cobro y por qué vía.
 *
 * No escribe nada. Solo imprime diagnóstico + link sugerido por startup.
 *
 * Uso:
 *   npx tsx scripts/audit-retomar-pagos.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Stripe from "stripe";
import { getAllApplications, type PostulacionRecord } from "../src/lib/airtable";

const stripeKey =
  process.env.STRIPE_MODE === "production"
    ? process.env.STRIPE_SECRET_KEY_PROD!
    : process.env.STRIPE_SECRET_KEY_TEST!;
const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
const MODE = process.env.STRIPE_MODE === "production" ? "PROD" : "TEST";

const TARGETS = [
  "Kawesqar Travels",
  "PIXLAB CLASS",
  "Maity",
  "Finsphera",
  "Antü",
  "Zeii",
  "Aventia Solutions",
  "LEAF",
];

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findApp(target: string, apps: PostulacionRecord[]): PostulacionRecord | null {
  const t = norm(target);
  const exact = apps.find((a) => norm(a.startup_name ?? "") === t);
  if (exact) return exact;
  const partial = apps.filter((a) => {
    const n = norm(a.startup_name ?? "");
    return n.includes(t) || t.includes(n);
  });
  return partial.length === 1 ? partial[0] : null;
}

type Diagnostico = {
  startup: string;
  email: string;
  airtable: {
    postulacion_id: string;
    payment_status: string;
    total_cuotas: number | undefined;
    payment_failed_at: string | undefined;
    customer_id: string | undefined;
    sub_id: string | undefined;
    portal_access: boolean;
  };
  stripe: {
    customer_id: string | null;
    sub_id: string | null;
    sub_status: string | null;
    sub_current_period_end: string | null;
    facturas_pagadas: number;
    facturas_abiertas: number;
    monto_pendiente_usd: number;
    tarjeta: string | null;
    motivo_fallo: string | null;
  };
  accion: string;
  notas: string[];
};

async function diagnosticar(startup: string, app: PostulacionRecord | null): Promise<Diagnostico> {
  const out: Diagnostico = {
    startup,
    email: app?.email ?? "",
    airtable: {
      postulacion_id: app?.id ?? "",
      payment_status: app?.payment_status ?? "",
      total_cuotas: app?.total_cuotas,
      payment_failed_at: app?.payment_failed_at,
      customer_id: app?.stripe_customer_id,
      sub_id: app?.stripe_subscription_id,
      portal_access: app?.portal_access ?? false,
    },
    stripe: {
      customer_id: null,
      sub_id: null,
      sub_status: null,
      sub_current_period_end: null,
      facturas_pagadas: 0,
      facturas_abiertas: 0,
      monto_pendiente_usd: 0,
      tarjeta: null,
      motivo_fallo: null,
    },
    accion: "",
    notas: [],
  };

  if (!app) {
    out.accion = "❌ NO ENCONTRADA en Airtable";
    return out;
  }
  if (!app.email) {
    out.accion = "❌ Postulación sin email";
    return out;
  }

  // 1) Customer: usar el de Airtable si existe, sino buscar por email
  let customerId = app.stripe_customer_id ?? null;
  if (!customerId) {
    const list = await stripe.customers.list({ email: app.email, limit: 5 });
    if (list.data.length === 0) {
      out.accion = "🆕 SIN customer en Stripe → crear Checkout link nuevo";
      out.notas.push("No hay customer Stripe con ese email");
      return out;
    }
    customerId = list.data[0].id;
    if (list.data.length > 1) {
      out.notas.push(`⚠ Hay ${list.data.length} customers con el mismo email`);
    }
  }
  out.stripe.customer_id = customerId;

  // 2) Suscripciones del customer
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
  // Priorizar problemáticas > activas > otras
  const problem = subs.data.find((s) =>
    ["past_due", "unpaid", "incomplete"].includes(s.status)
  );
  const active = subs.data.find((s) => s.status === "active");
  const sub = problem ?? active ?? subs.data[0] ?? null;
  if (sub) {
    out.stripe.sub_id = sub.id;
    out.stripe.sub_status = sub.status;
    const periodEnd = (sub as { current_period_end?: number }).current_period_end;
    out.stripe.sub_current_period_end = periodEnd
      ? new Date(periodEnd * 1000).toISOString().slice(0, 10)
      : null;
  }

  // 3) Facturas
  const invList = await stripe.invoices.list({
    customer: customerId,
    limit: 24,
    expand: ["data.charge"],
  });
  for (const inv of invList.data) {
    if (inv.status === "paid") out.stripe.facturas_pagadas++;
    if (inv.status === "open") {
      out.stripe.facturas_abiertas++;
      out.stripe.monto_pendiente_usd += (inv.amount_due ?? 0) / 100;
    }
    // Tarjeta + último fallo (de cualquier factura reciente)
    const charge = (inv as { charge?: unknown }).charge;
    if (charge && typeof charge !== "string") {
      const c = charge as Stripe.Charge;
      const det = c.payment_method_details?.card;
      if (det && !out.stripe.tarjeta) {
        out.stripe.tarjeta = `${det.brand} **** ${det.last4}`;
      }
      if (c.failure_message && !out.stripe.motivo_fallo) {
        out.stripe.motivo_fallo = c.failure_message;
      }
    }
  }

  // 4) Decisión
  const pagadas = out.stripe.facturas_pagadas;
  const abiertas = out.stripe.facturas_abiertas;
  const total = app.total_cuotas ?? 3;
  const subStatus = out.stripe.sub_status;

  if (subStatus === "active" && abiertas === 0) {
    out.accion = `✅ OK — Stripe cobrará la próxima cuota automáticamente (${pagadas}/${total} pagadas)`;
  } else if (subStatus === "past_due" || subStatus === "unpaid") {
    out.accion = `🟠 TARJETA FALLÓ — mandar link Billing Portal (US$${out.stripe.monto_pendiente_usd.toFixed(2)} pendiente)`;
  } else if (subStatus === "incomplete") {
    out.accion = `🟠 SUSCRIPCIÓN INCOMPLETA — mandar link Billing Portal o recrear Checkout`;
  } else if (subStatus === "canceled" && pagadas < total) {
    out.accion = `🔴 SUSCRIPCIÓN CANCELADA con ${pagadas}/${total} cuotas — generar Checkout nuevo por cuota faltante`;
  } else if (!sub && pagadas === 0) {
    out.accion = `🆕 SIN suscripción ni pagos — generar Checkout link nuevo`;
  } else if (!sub && pagadas >= total) {
    out.accion = `✅ Pago único completado (${pagadas} facturas pagadas)`;
  } else if (subStatus === "canceled" && pagadas >= total) {
    out.accion = `✅ Plan completado (${pagadas}/${total})`;
  } else {
    out.accion = `❓ Revisar manual — status=${subStatus} pagadas=${pagadas}/${total} abiertas=${abiertas}`;
  }

  return out;
}

async function billingPortalLink(customerId: string): Promise<string | null> {
  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/portal/suscripcion`,
    });
    return session.url;
  } catch (err) {
    return `error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
  console.log(`║  AUDITORÍA RETOMAR PAGOS — Stripe ${MODE.padEnd(33)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);

  const apps = await getAllApplications();
  console.log(`Airtable: ${apps.length} postulaciones cargadas\n`);

  const diags: Diagnostico[] = [];
  for (const startup of TARGETS) {
    const app = findApp(startup, apps);
    process.stdout.write(`  → ${startup.padEnd(22)} `);
    try {
      const d = await diagnosticar(startup, app);
      diags.push(d);
      console.log(d.accion);
    } catch (err) {
      console.log(`💥 ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n────────────────────────────────────────────────────────────────────\n`);
  console.log(`DETALLE POR STARTUP\n`);

  for (const d of diags) {
    console.log(`▸ ${d.startup}  <${d.email}>`);
    console.log(`  Airtable:  status="${d.airtable.payment_status}" total_cuotas=${d.airtable.total_cuotas ?? "-"} failed_at=${d.airtable.payment_failed_at ?? "-"} portal_access=${d.airtable.portal_access}`);
    console.log(`             customer=${d.airtable.customer_id ?? "-"} sub=${d.airtable.sub_id ?? "-"}`);
    console.log(`  Stripe:    customer=${d.stripe.customer_id ?? "-"} sub=${d.stripe.sub_id ?? "-"} (${d.stripe.sub_status ?? "no sub"})`);
    console.log(`             facturas: ${d.stripe.facturas_pagadas} pagadas, ${d.stripe.facturas_abiertas} abiertas (US$${d.stripe.monto_pendiente_usd.toFixed(2)} pendiente)`);
    console.log(`             tarjeta: ${d.stripe.tarjeta ?? "-"}${d.stripe.motivo_fallo ? `  — fallo: ${d.stripe.motivo_fallo}` : ""}`);
    if (d.stripe.sub_current_period_end) {
      console.log(`             período actual termina: ${d.stripe.sub_current_period_end}`);
    }
    console.log(`  ACCIÓN:    ${d.accion}`);
    if (d.notas.length) d.notas.forEach((n) => console.log(`             ${n}`));
    console.log();
  }

  console.log(`────────────────────────────────────────────────────────────────────\n`);
  console.log(`LINKS BILLING PORTAL (para los que tienen suscripción problemática)\n`);

  for (const d of diags) {
    const necesita = d.stripe.sub_status === "past_due"
      || d.stripe.sub_status === "unpaid"
      || d.stripe.sub_status === "incomplete";
    if (!necesita || !d.stripe.customer_id) continue;
    const link = await billingPortalLink(d.stripe.customer_id);
    console.log(`▸ ${d.startup}  <${d.email}>`);
    console.log(`  ${link}\n`);
  }

  console.log(`\n── Resumen ──`);
  const c = { ok: 0, past_due: 0, canceled: 0, sin_customer: 0, otro: 0 };
  for (const d of diags) {
    if (d.accion.startsWith("✅")) c.ok++;
    else if (d.accion.startsWith("🟠")) c.past_due++;
    else if (d.accion.startsWith("🔴")) c.canceled++;
    else if (d.accion.startsWith("🆕")) c.sin_customer++;
    else c.otro++;
  }
  console.log(`  ✅ OK (Stripe cobra solo):       ${c.ok}`);
  console.log(`  🟠 Tarjeta falló (Billing link): ${c.past_due}`);
  console.log(`  🔴 Sub cancelada (Checkout):     ${c.canceled}`);
  console.log(`  🆕 Sin customer (Checkout):      ${c.sin_customer}`);
  console.log(`  ❓ Revisar manual:               ${c.otro}\n`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});

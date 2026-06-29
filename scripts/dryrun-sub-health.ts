/**
 * Dry-run del cron /api/cron/sub-health usando la lógica directa.
 * Útil porque /api/cron/sub-health GET requiere CRON_SECRET y red activa.
 *
 * Uso: npx tsx scripts/dryrun-sub-health.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Stripe from "stripe";
import { getAllApplications, type PostulacionRecord } from "../src/lib/airtable";

const stripeKey = process.env.STRIPE_MODE === "production"
  ? process.env.STRIPE_SECRET_KEY_PROD!
  : process.env.STRIPE_SECRET_KEY_TEST!;
const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
const MODE = process.env.STRIPE_MODE === "production" ? "PROD" : "TEST";

async function getDefaultCard(customerId: string): Promise<{ id: string | null; brand: string | null; last4: string | null }> {
  try {
    const c = await stripe.customers.retrieve(customerId, { expand: ["invoice_settings.default_payment_method"] });
    if ("deleted" in c) return { id: null, brand: null, last4: null };
    const pm = c.invoice_settings?.default_payment_method;
    if (pm && typeof pm !== "string" && pm.id) {
      return { id: pm.id, brand: pm.card?.brand ?? null, last4: pm.card?.last4 ?? null };
    }
    const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 5 });
    const first = pms.data[0];
    return first
      ? { id: first.id, brand: first.card?.brand ?? null, last4: first.card?.last4 ?? null }
      : { id: null, brand: null, last4: null };
  } catch { return { id: null, brand: null, last4: null }; }
}

async function main() {
  console.log(`\n══ DRY-RUN sub-health (Stripe ${MODE}) ══\n`);
  const apps = await getAllApplications();
  const target = apps.filter((a) =>
    (a.status === "Inscrita" || a.status === "Invitada institucional")
    && a.payment_status !== "Beca 100%" && a.discount_percent !== 100
  );
  console.log(`Procesando ${target.length} inscritas (sin becas 100%)\n`);

  let conAccion = 0;
  const counts: Record<string, number> = {};

  for (const app of target) {
    if (!app.email) continue;

    let customerId = app.stripe_customer_id ?? null;
    if (!customerId) {
      const list = await stripe.customers.list({ email: app.email, limit: 3 });
      customerId = list.data[0]?.id ?? null;
    }
    if (!customerId) continue;

    const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
    const sub = subs.data.find((s) => ["past_due","unpaid","incomplete"].includes(s.status))
      ?? subs.data.find((s) => s.status === "active")
      ?? subs.data[0] ?? null;
    const invs = await stripe.invoices.list({ customer: customerId, limit: 24 });
    const facturasPagadas = invs.data.filter((i) => i.status === "paid").length;
    const total = app.total_cuotas ?? 3;

    const acciones: string[] = [];

    if (facturasPagadas > total && sub && sub.status !== "canceled") {
      acciones.push(`⚠ ALERTA sobrecobro: ${facturasPagadas} pagadas vs ${total} cuotas (sub ${sub.id})`);
      counts.alerta_sobrecobro = (counts.alerta_sobrecobro ?? 0) + 1;
    }

    if (sub && ["past_due","unpaid"].includes(sub.status) && !app.payment_failed_at) {
      acciones.push(`→ marcaría payment_failed_at (sub.status=${sub.status})`);
      counts.marcado_failed = (counts.marcado_failed ?? 0) + 1;
    } else {
      const ahora = Math.floor(Date.now() / 1000);
      const openSinCobro = invs.data.find((i) => {
        if (i.status !== "open" || (i.attempt_count ?? 0) !== 0) return false;
        const due = (i as { due_date?: number | null }).due_date;
        return !due || due <= ahora;
      });
      if (openSinCobro) {
        const card = await getDefaultCard(customerId);
        if (card.id) {
          acciones.push(`→ intentaría stripe.invoices.pay(${openSinCobro.id}) con ${card.brand} **** ${card.last4} — US$${(openSinCobro.amount_due ?? 0) / 100}`);
          counts.cobrado = (counts.cobrado ?? 0) + 1;
        } else {
          acciones.push(`→ sin tarjeta default — marcaría payment_failed_at para factura ${openSinCobro.id}`);
          counts.sin_tarjeta_marcado_failed = (counts.sin_tarjeta_marcado_failed ?? 0) + 1;
        }
      }
    }

    if (acciones.length === 0) continue;
    conAccion++;
    console.log(`▸ ${app.startup_name}  <${app.email}>`);
    console.log(`   sub: ${sub?.id ?? "-"}  status: ${sub?.status ?? "-"}  pagadas: ${facturasPagadas}/${total}  failed_at: ${app.payment_failed_at ?? "(vacío)"}`);
    for (const a of acciones) console.log(`   ${a}`);
    console.log();
  }

  console.log(`── Resumen dry-run ──`);
  console.log(`  Filas con acción: ${conAccion}`);
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log();
}

main().catch((err) => { console.error("ERROR:", err); process.exit(1); });

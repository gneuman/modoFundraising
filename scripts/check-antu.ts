/**
 * Read-only: inspecciona Antü para ver fechas exactas de la factura abierta.
 * Uso: npx tsx scripts/check-antu.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Stripe from "stripe";
import { getAllApplications } from "../src/lib/airtable";

const EMAIL = "manuel.mata@antuenergia.cl";
const stripeKey = process.env.STRIPE_MODE === "production"
  ? process.env.STRIPE_SECRET_KEY_PROD!
  : process.env.STRIPE_SECRET_KEY_TEST!;
const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

function fmt(unix?: number | null): string {
  if (!unix) return "(null)";
  const d = new Date(unix * 1000);
  return `${d.toISOString().slice(0, 10)} (${d.toISOString()})`;
}

function diasDesdeHoy(unix?: number | null): string {
  if (!unix) return "-";
  const dias = (unix * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
  return `${dias >= 0 ? "+" : ""}${dias.toFixed(1)} días`;
}

async function main() {
  console.log(`\n═══ Antü check (${process.env.STRIPE_MODE === "production" ? "PROD" : "TEST"}) ═══\n`);
  const apps = await getAllApplications();
  const app = apps.find((a) => (a.email ?? "").toLowerCase() === EMAIL);
  if (!app) { console.log("❌ no encontrada"); return; }

  console.log(`Postulación: ${app.startup_name} — payment_status="${app.payment_status}" total_cuotas=${app.total_cuotas}\n`);

  const customers = await stripe.customers.list({ email: EMAIL, limit: 5 });
  for (const c of customers.data) {
    console.log(`── Customer ${c.id} ──`);

    const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 10 });
    for (const s of subs.data) {
      const cpe = (s as { current_period_end?: number }).current_period_end;
      const cps = (s as { current_period_start?: number }).current_period_start;
      const cancelAt = (s as { cancel_at?: number | null }).cancel_at;
      console.log(`  sub ${s.id} status=${s.status}`);
      console.log(`     current_period_start: ${fmt(cps)}  (${diasDesdeHoy(cps)})`);
      console.log(`     current_period_end:   ${fmt(cpe)}  (${diasDesdeHoy(cpe)})`);
      console.log(`     cancel_at:            ${fmt(cancelAt)}  (${diasDesdeHoy(cancelAt)})`);
      console.log(`     collection_method:    ${(s as { collection_method?: string }).collection_method}`);
      console.log(`     billing_cycle_anchor: ${fmt((s as { billing_cycle_anchor?: number }).billing_cycle_anchor)}`);
    }
    console.log();

    const invs = await stripe.invoices.list({ customer: c.id, limit: 24 });
    for (const inv of invs.data.filter((i) => i.status === "open")) {
      const due = (inv as { due_date?: number | null }).due_date;
      const periodStart = (inv as { period_start?: number }).period_start;
      const periodEnd = (inv as { period_end?: number }).period_end;
      const nextAttempt = (inv as { next_payment_attempt?: number | null }).next_payment_attempt;
      console.log(`  ── Factura ABIERTA ${inv.id} ──`);
      console.log(`     status:               ${inv.status}`);
      console.log(`     billing_reason:       ${inv.billing_reason}`);
      console.log(`     collection_method:    ${inv.collection_method}`);
      console.log(`     amount_due:           US$${(inv.amount_due ?? 0) / 100}`);
      console.log(`     attempt_count:        ${inv.attempt_count}`);
      console.log(`     created:              ${fmt(inv.created)}  (${diasDesdeHoy(inv.created)})`);
      console.log(`     period_start:         ${fmt(periodStart)}  (${diasDesdeHoy(periodStart)})`);
      console.log(`     period_end:           ${fmt(periodEnd)}  (${diasDesdeHoy(periodEnd)})`);
      console.log(`     due_date:             ${fmt(due)}  (${diasDesdeHoy(due)})`);
      console.log(`     next_payment_attempt: ${fmt(nextAttempt)}  (${diasDesdeHoy(nextAttempt)})`);
      if (inv.hosted_invoice_url) console.log(`     hosted: ${inv.hosted_invoice_url}`);
    }
  }
}

main().catch((err) => { console.error("ERROR:", err); process.exit(1); });

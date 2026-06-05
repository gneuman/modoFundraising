/**
 * Read-only: inspecciona el caso direccion@maity.cloud end-to-end.
 * Airtable (postulación + pagos) + Stripe (customer + sub + facturas + events).
 *
 * Uso: npx tsx scripts/check-maity.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Stripe from "stripe";
import { getAllApplications, getAllPagos } from "../src/lib/airtable";

const EMAIL = "direccion@maity.cloud";
const stripeKey =
  process.env.STRIPE_MODE === "production"
    ? process.env.STRIPE_SECRET_KEY_PROD!
    : process.env.STRIPE_SECRET_KEY_TEST!;
const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
const MODE = process.env.STRIPE_MODE === "production" ? "PROD" : "TEST";

async function main() {
  console.log(`\n═══ Maity check (Stripe ${MODE}) ═══\n`);

  // ── Airtable ─────────────────────────────────────────────────────────────
  const [apps, pagos] = await Promise.all([getAllApplications(), getAllPagos()]);
  const app = apps.find((a) => (a.email ?? "").toLowerCase() === EMAIL);
  if (!app) { console.log("❌ No encontrada en Airtable"); return; }

  console.log("── Airtable (Postulaciones MF26) ──");
  console.log(`  id:                       ${app.id}`);
  console.log(`  startup_name:             ${app.startup_name}`);
  console.log(`  first_name:               ${app.first_name}`);
  console.log(`  status:                   ${app.status}`);
  console.log(`  payment_status:           ${app.payment_status}`);
  console.log(`  total_cuotas:             ${app.total_cuotas}`);
  console.log(`  portal_access:            ${app.portal_access}`);
  console.log(`  discount_percent:         ${app.discount_percent ?? "-"}`);
  console.log(`  stripe_customer_id:       ${app.stripe_customer_id ?? "(vacío)"}`);
  console.log(`  stripe_subscription_id:   ${app.stripe_subscription_id ?? "(vacío)"}`);
  console.log(`  payment_failed_at:        ${app.payment_failed_at ?? "(vacío)"}`);
  console.log(`  payment_resolved_at:      ${app.payment_resolved_at ?? "(vacío)"}`);
  console.log();

  // ── Airtable Pagos ───────────────────────────────────────────────────────
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const startupNorm = norm(app.startup_name ?? "");
  const pagosMaity = pagos.filter((p) =>
    (p.email && p.email.toLowerCase().trim() === EMAIL)
    || (p.startup_name && norm(p.startup_name) === startupNorm)
  );
  console.log(`── Airtable (Pagos MF26) — ${pagosMaity.length} registros ──`);
  for (const p of pagosMaity) {
    console.log(`  • cuota ${p.cuota} · US$${p.amount} · ${p.status ?? "-"} · invoice=${p.stripe_invoice_id ?? "-"} · sub=${p.stripe_subscription_id ?? "-"} · ${p.paid_at ?? ""}`);
  }
  console.log();

  // ── Stripe customer + subs + facturas ────────────────────────────────────
  const customers = await stripe.customers.list({ email: EMAIL, limit: 10 });
  console.log(`── Stripe customers con email ${EMAIL}: ${customers.data.length} ──`);
  for (const c of customers.data) {
    console.log(`  • ${c.id}  name="${c.name}"  created=${new Date(c.created * 1000).toISOString().slice(0, 10)}`);
  }
  console.log();

  for (const customer of customers.data) {
    console.log(`── Customer ${customer.id} ──`);
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 10 });
    for (const s of subs.data) {
      const cpe = (s as { current_period_end?: number }).current_period_end;
      const cancelAt = (s as { cancel_at?: number | null }).cancel_at;
      const created = new Date(s.created * 1000).toISOString().slice(0, 10);
      console.log(`  sub ${s.id}:`);
      console.log(`     status:                ${s.status}`);
      console.log(`     created:               ${created}`);
      console.log(`     current_period_end:    ${cpe ? new Date(cpe * 1000).toISOString().slice(0, 10) : "-"}`);
      console.log(`     cancel_at:             ${cancelAt ? new Date(cancelAt * 1000).toISOString().slice(0, 10) : "-"}`);
      console.log(`     cancel_at_period_end:  ${s.cancel_at_period_end}`);
      console.log(`     metadata:              ${JSON.stringify(s.metadata)}`);
      // Items
      for (const item of s.items.data) {
        const price = item.price;
        console.log(`     item: price=${price.id} · unit=${(price.unit_amount ?? 0) / 100} ${price.currency}/${price.recurring?.interval}`);
      }
    }
    console.log();

    const invs = await stripe.invoices.list({ customer: customer.id, limit: 24, expand: ["data.charge"] });
    console.log(`  facturas (${invs.data.length}):`);
    for (const inv of invs.data) {
      const created = new Date(inv.created * 1000).toISOString().slice(0, 10);
      const sub = (inv as { subscription?: string }).subscription;
      const charge = (inv as { charge?: unknown }).charge;
      let card = "-", failMsg = "-";
      if (charge && typeof charge !== "string") {
        const c = charge as Stripe.Charge;
        const det = c.payment_method_details?.card;
        if (det) card = `${det.brand} **** ${det.last4}`;
        if (c.failure_message) failMsg = c.failure_message;
      }
      console.log(`     • ${inv.id} · ${created} · status=${inv.status} · reason=${inv.billing_reason} · due=US$${(inv.amount_due ?? 0) / 100} · paid=US$${(inv.amount_paid ?? 0) / 100} · attempts=${inv.attempt_count}`);
      console.log(`       sub=${sub ?? "-"} · card=${card} · failure="${failMsg}"`);
      if (inv.hosted_invoice_url) console.log(`       hosted: ${inv.hosted_invoice_url}`);
    }
    console.log();
  }

  // ── Eventos de webhook recientes para el customer ────────────────────────
  if (customers.data[0]) {
    console.log(`── Últimos 20 eventos de Stripe para customer ${customers.data[0].id} ──`);
    const events = await stripe.events.list({ limit: 100 });
    let found = 0;
    for (const ev of events.data) {
      const obj = ev.data.object as { customer?: string; id?: string };
      const subId = (ev.data.object as { subscription?: string }).subscription;
      const matchesCustomer = obj.customer === customers.data[0].id;
      const isInvoiceForOurCustomer = ev.type.startsWith("invoice.") && obj.customer === customers.data[0].id;
      const isSubForOurCustomer = ev.type.startsWith("customer.subscription") && obj.customer === customers.data[0].id;
      if (matchesCustomer || isInvoiceForOurCustomer || isSubForOurCustomer || (subId && false)) {
        const when = new Date(ev.created * 1000).toISOString();
        console.log(`  ${when}  ${ev.type}  obj=${obj.id ?? "-"}`);
        found++;
        if (found >= 20) break;
      }
    }
    if (found === 0) console.log("  (sin eventos recientes — Stripe solo guarda 30 días)");
  }

  // ── Diagnóstico final ────────────────────────────────────────────────────
  console.log("\n── Diagnóstico ──");
  const pagadasAirtable = pagosMaity.length;
  const total = app.total_cuotas ?? 3;
  console.log(`  Cuotas en Airtable Pagos:   ${pagadasAirtable}/${total}`);
  console.log(`  Cuotas en Stripe (paid):    ver arriba`);
  console.log(`  Payment status Airtable:    "${app.payment_status}"`);
  console.log(`  ¿Coincide?:                  ${pagadasAirtable === parseInt((app.payment_status ?? "0").match(/Cuota (\d+)/)?.[1] ?? "0", 10)}`);
}

main().catch((err) => { console.error("ERROR:", err); process.exit(1); });

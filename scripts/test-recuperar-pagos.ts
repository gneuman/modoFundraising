/**
 * Replica la lógica de /api/admin/recuperar-pagos GET sin requerir auth.
 * Imprime para cada inscrita la decisión que tomaría el endpoint.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Stripe from "stripe";
import { getAllApplications, getAllPagos, type PostulacionRecord, type PagoRecord } from "../src/lib/airtable";

const stripeKey = process.env.STRIPE_MODE === "production"
  ? process.env.STRIPE_SECRET_KEY_PROD!
  : process.env.STRIPE_SECRET_KEY_TEST!;
const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

type StripeDiag = {
  customerId: string | null; subId: string | null; subStatus: string | null;
  facturasPagadas: number; facturasAbiertas: number; montoPendienteUsd: number;
};

async function diagnosticarStripe(app: PostulacionRecord): Promise<StripeDiag> {
  const out: StripeDiag = { customerId: null, subId: null, subStatus: null, facturasPagadas: 0, facturasAbiertas: 0, montoPendienteUsd: 0 };
  if (!app.email) return out;
  let customerId = app.stripe_customer_id ?? null;
  if (!customerId) {
    const list = await stripe.customers.list({ email: app.email, limit: 5 });
    customerId = list.data[0]?.id ?? null;
  }
  if (!customerId) return out;
  out.customerId = customerId;
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
  const sub = subs.data.find((s) => ["past_due","unpaid","incomplete"].includes(s.status))
    ?? subs.data.find((s) => s.status === "active") ?? subs.data[0] ?? null;
  if (sub) { out.subId = sub.id; out.subStatus = sub.status; }
  const invs = await stripe.invoices.list({ customer: customerId, limit: 24 });
  for (const inv of invs.data) {
    if (inv.status === "paid") out.facturasPagadas++;
    if (inv.status === "open") { out.facturasAbiertas++; out.montoPendienteUsd += (inv.amount_due ?? 0) / 100; }
  }
  return out;
}

function decidirAccion(app: PostulacionRecord, s: StripeDiag, pagadasAirtable: number) {
  if (!app.email) return { tipo: "sin_email", pagadas: 0 };
  if (app.payment_status === "Beca 100%" || app.discount_percent === 100) return { tipo: "beca", pagadas: 0 };
  const total = app.total_cuotas ?? 3;
  const pagadas = Math.max(s.facturasPagadas, pagadasAirtable);
  if (pagadas >= total) return { tipo: "completado", pagadas };
  if (s.subStatus === "past_due" || s.subStatus === "unpaid") return { tipo: "billing_portal", pagadas };
  if (s.subStatus === "incomplete") return { tipo: "billing_portal", pagadas };
  if (s.subStatus === "active") return { tipo: "ok_auto", pagadas };
  if (s.subStatus === "canceled") return { tipo: "checkout", pagadas };
  if (!s.subId && pagadas === 0) return { tipo: "checkout", pagadas };
  if (!s.subId && pagadas > 0) return { tipo: "checkout", pagadas };
  return { tipo: "revisar", pagadas };
}

async function main() {
  const [apps, pagos] = await Promise.all([getAllApplications(), getAllPagos()]);
  const target = apps.filter((a) =>
    a.status === "Inscrita" || a.status === "Invitada institucional"
    || (a.payment_status && a.payment_status !== "Pendiente")
  );

  function pagosDe(app: PostulacionRecord): PagoRecord[] {
    const startupNorm = norm(app.startup_name ?? "");
    const em = (app.email ?? "").toLowerCase().trim();
    return pagos.filter((p) =>
      (p.email && p.email.toLowerCase().trim() === em)
      || (p.startup_name && norm(p.startup_name) === startupNorm && startupNorm.length > 0)
    );
  }

  console.log(`\n${"Startup".padEnd(28)} ${"total".padStart(5)} ${"pagAT".padStart(5)} ${"pagST".padStart(5)} ${"sub".padEnd(12)} → decisión`);
  console.log("─".repeat(110));
  for (const app of target) {
    const s = await diagnosticarStripe(app);
    const pagosAt = pagosDe(app).length;
    const dec = decidirAccion(app, s, pagosAt);
    const name = (app.startup_name ?? "").slice(0, 28).padEnd(28);
    const total = (app.total_cuotas ?? "u").toString().padStart(5);
    const pagAT = pagosAt.toString().padStart(5);
    const pagST = s.facturasPagadas.toString().padStart(5);
    const sub = (s.subStatus ?? "-").padEnd(12);
    console.log(`${name} ${total} ${pagAT} ${pagST} ${sub} → ${dec.tipo} (pagadas=${dec.pagadas})`);
  }
  console.log();
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * Read-only: detecta suscripciones en Stripe que YA pagaron todas sus cuotas
 * pero siguen activas (no fueron canceladas). Esto pasa con las negociadas a
 * mano antes de que el webhook supiera de total_cuotas, o si la sub no estaba
 * linkeada a la postulación.
 *
 * Imprime: startup, email, sub, status, cuotas pagadas / total, candidato a
 * cancelar.
 *
 * Uso:
 *   npx tsx scripts/audit-subs-completadas.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Stripe from "stripe";
import { getAllApplications } from "../src/lib/airtable";

const stripeKey =
  process.env.STRIPE_MODE === "production"
    ? process.env.STRIPE_SECRET_KEY_PROD!
    : process.env.STRIPE_SECRET_KEY_TEST!;
const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
const MODE = process.env.STRIPE_MODE === "production" ? "PROD" : "TEST";

async function main() {
  console.log(`\nAuditando subs completadas pero vivas en Stripe (${MODE})\n`);
  const apps = await getAllApplications();
  const candidatos: Array<{ startup: string; email: string; subId: string; status: string; pagadas: number; total: number; airtableSub: string | null }> = [];

  for (const app of apps) {
    if (!app.email) continue;
    if (app.status !== "Inscrita" && app.status !== "Invitada institucional") continue;

    // Resolver customer
    let customerId = app.stripe_customer_id ?? null;
    if (!customerId) {
      const list = await stripe.customers.list({ email: app.email, limit: 3 });
      customerId = list.data[0]?.id ?? null;
    }
    if (!customerId) continue;

    const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
    const invs = await stripe.invoices.list({ customer: customerId, limit: 24 });
    const pagadas = invs.data.filter((i) => i.status === "paid").length;
    const total = app.total_cuotas ?? 3;

    for (const sub of subs.data) {
      if (sub.status === "canceled") continue;
      // Sub viva con todas las cuotas pagadas
      if (pagadas >= total) {
        candidatos.push({
          startup: app.startup_name ?? "(sin nombre)",
          email: app.email,
          subId: sub.id,
          status: sub.status,
          pagadas,
          total,
          airtableSub: app.stripe_subscription_id ?? null,
        });
      }
    }
  }

  if (candidatos.length === 0) {
    console.log("✅ Ninguna suscripción viva está en estado completado. Todo OK.\n");
    return;
  }

  console.log(`⚠ ${candidatos.length} suscripciones a cancelar:\n`);
  for (const c of candidatos) {
    console.log(`▸ ${c.startup}  <${c.email}>`);
    console.log(`  sub: ${c.subId}  status: ${c.status}  cuotas: ${c.pagadas}/${c.total}`);
    console.log(`  airtable sub: ${c.airtableSub ?? "(no linkeado)"}`);
    console.log();
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});

/**
 * Auditoría READ-ONLY (MAA · Medir) para OP-2205.
 *
 * Mide el hueco que cierra el flujo de reactivación automática: founders que
 * están en Churn / Churn By Founder en Airtable PERO cuya suscripción en Stripe
 * sigue "active" o tiene un pago reciente. Esos son los "cobrados pero afuera":
 * pagaron y el sistema no les devolvió el acceso.
 *
 * Este número debe caer a 0 una vez que el webhook reactiva por pago.
 *
 * No escribe nada. Solo imprime.
 *
 * Uso:
 *   npx tsx scripts/audit-churn-con-pago.ts
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
  console.log(`\n[audit-churn-con-pago] modo Stripe: ${MODE}\n`);

  const apps = await getAllApplications();
  const churned = apps.filter(
    (a) => a.status === "Churn" || a.status === "Churn By Founder",
  );
  console.log(`Postulaciones en Churn / Churn By Founder: ${churned.length}\n`);

  const sospechosos: string[] = [];

  for (const app of churned) {
    const subId = app.stripe_subscription_id;
    if (!subId) continue;

    let sub: Stripe.Subscription | null = null;
    try {
      sub = await stripe.subscriptions.retrieve(subId);
    } catch {
      // sub borrada / no existe — es churn legítimo, saltar
      continue;
    }

    // Señal 1: la sub sigue activa → está pagando pero marcado como baja
    const activa = sub.status === "active" || sub.status === "trialing";

    // Señal 2: pago reciente (últimos 45 días) aunque la sub ya no esté activa
    const invoices = await stripe.invoices.list({ subscription: subId, limit: 5 });
    const ahora = Math.floor(Date.now() / 1000);
    const pagoReciente = invoices.data.some(
      (inv) =>
        inv.status === "paid" &&
        inv.status_transitions?.paid_at &&
        ahora - inv.status_transitions.paid_at < 45 * 24 * 60 * 60,
    );

    if (activa || pagoReciente) {
      const flags = [activa ? `sub=${sub.status}` : null, pagoReciente ? "pago<45d" : null]
        .filter(Boolean)
        .join(", ");
      sospechosos.push(
        `  ⚠️  ${app.startup_name ?? "?"} (${app.email ?? "?"}) — status Airtable="${app.status}", ${flags}`,
      );
    }
  }

  console.log("─".repeat(70));
  if (sospechosos.length === 0) {
    console.log("✅ 0 founders 'cobrados pero afuera'. El hueco está cerrado.");
  } else {
    console.log(`🚨 ${sospechosos.length} founders 'cobrados pero afuera':\n`);
    sospechosos.forEach((s) => console.log(s));
    console.log(
      `\nEstos deberían recuperar acceso. Con el flujo nuevo, su próximo pago los reactiva.`,
    );
    console.log(`Para reactivarlos YA: botón "Reactivar acceso manual" en /admin/churn.`);
  }
  console.log("─".repeat(70) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

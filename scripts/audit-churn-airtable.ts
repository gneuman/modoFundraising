/**
 * READ-ONLY, solo Airtable (no requiere llaves de Stripe).
 * Lista las postulaciones en Churn y su payment_status, para dimensionar
 * cuantas son candidatas al bug de la cuota 4 antes de cruzar contra Stripe.
 *
 * Uso: npx tsx scripts/audit-churn-airtable.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getAllApplications } from "../src/lib/airtable";

async function main() {
  const apps = await getAllApplications();

  const churn = apps.filter((a) => a.status === "Churn");
  const churnFounder = apps.filter((a) => a.status === "Churn By Founder");

  console.log(`\nTotal postulaciones: ${apps.length}`);
  console.log(`Estado "Churn" (baja por el sistema): ${churn.length}`);
  console.log(`Estado "Churn By Founder" (baja voluntaria): ${churnFounder.length}\n`);

  console.log("--- Churn por el sistema, con lo que alcanzaron a pagar ---");
  const cuotaDe = (s?: string) =>
    parseInt((s ?? "").match(/Cuota (\d+) pagada/)?.[1] ?? "0", 10);

  const ordenadas = [...churn].sort((a, b) => cuotaDe(b.payment_status) - cuotaDe(a.payment_status));

  for (const a of ordenadas) {
    const c = cuotaDe(a.payment_status);
    const marca = c >= 3 ? "  <<< SOSPECHOSA (pago 3+)" : "";
    console.log(
      `  ${(a.startup_name ?? "—").padEnd(26)} ${(a.email ?? "—").padEnd(34)} ` +
      `status_pago="${(a.payment_status ?? "—").padEnd(16)}" total_cuotas=${a.total_cuotas ?? "VACIO"}${marca}`,
    );
  }

  const sospechosas = churn.filter((a) => cuotaDe(a.payment_status) >= 3);
  console.log(`\nSospechosas de baja indebida (pagaron 3+ cuotas): ${sospechosas.length}`);
  console.log("Falta cruzar contra Stripe para confirmar los pagos reales.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });

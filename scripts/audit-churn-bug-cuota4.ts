/**
 * READ-ONLY. Encuentra founders dados de baja por el bug de la cuota 4.
 *
 * El bug: `customer.subscription.deleted` comparaba contra "Cuota 3 pagada"
 * hardcodeado, y `cancel_at` se programaba asumiendo 3 cuotas aunque
 * total_cuotas estuviera vacío. En planes de 4, Stripe mataba la sub antes de
 * cobrar la cuarta (o justo despues de cobrarla) y el webhook hacia churn.
 *
 * Criterio de VICTIMA: esta en Churn (no "Churn By Founder" — esos se dieron de
 * baja ellos mismos) Y en Stripe tiene >= 3 facturas realmente pagadas.
 * Alguien que pago 3 o 4 cuotas no es un moroso: es una baja indebida.
 *
 * NO escribe nada. Solo imprime el reporte y un JSON para el script de fix.
 *
 * Uso:
 *   npx tsx scripts/audit-churn-bug-cuota4.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Stripe from "stripe";
import { getAllApplications } from "../src/lib/airtable";
import * as fs from "fs";

const stripeKey =
  process.env.STRIPE_MODE === "production"
    ? process.env.STRIPE_SECRET_KEY_PROD!
    : process.env.STRIPE_SECRET_KEY_TEST!;
const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
const MODE = process.env.STRIPE_MODE === "production" ? "PROD" : "TEST";

interface Victima {
  postulacionId: string;
  startup: string;
  email: string;
  status: string;
  paymentStatus: string;
  totalCuotas: number | null;
  facturasPagadas: number;
  montoPagadoUSD: number;
  ultimoPago: string;
  subs: string[];
  canceladaPorSistema: boolean;
  veredicto: string;
}

async function main() {
  console.log(`\n=== Auditoria: bajas indebidas por bug cuota 4 (${MODE}) ===\n`);

  const apps = await getAllApplications();

  // Solo los que el SISTEMA dio de baja. "Churn By Founder" = se fue el founder.
  const churned = apps.filter((a) => a.status === "Churn" && a.email);
  console.log(`Postulaciones en estado "Churn": ${churned.length}`);
  console.log(`(se excluyen las "Churn By Founder" — esas son bajas voluntarias)\n`);

  const victimas: Victima[] = [];
  const revisar: Victima[] = [];

  for (const app of churned) {
    const email = app.email!;

    let customerId = app.stripe_customer_id ?? null;
    if (!customerId) {
      const list = await stripe.customers.list({ email, limit: 3 });
      customerId = list.data[0]?.id ?? null;
    }
    if (!customerId) {
      console.log(`  · ${app.startup_name ?? email}: sin customer en Stripe — se omite`);
      continue;
    }

    const [subs, invs] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 }),
      stripe.invoices.list({ customer: customerId, limit: 30 }),
    ]);

    const pagadas = invs.data.filter((i) => i.status === "paid");
    const montoPagado = pagadas.reduce((s, i) => s + (i.amount_paid ?? 0), 0) / 100;
    const ultimo = pagadas
      .map((i) => i.status_transitions?.paid_at ?? 0)
      .sort((a, b) => b - a)[0];

    // ¿La sub la cancelo el sistema (cancel_at / cancelacion programada) y no un humano?
    const canceladaPorSistema = subs.data.some(
      (s) => s.status === "canceled" && !!s.cancel_at,
    );

    const row: Victima = {
      postulacionId: app.id!,
      startup: app.startup_name ?? email.split("@")[0],
      email,
      status: app.status!,
      paymentStatus: app.payment_status ?? "",
      totalCuotas: typeof app.total_cuotas === "number" ? app.total_cuotas : null,
      facturasPagadas: pagadas.length,
      montoPagadoUSD: montoPagado,
      ultimoPago: ultimo ? new Date(ultimo * 1000).toISOString().slice(0, 10) : "—",
      subs: subs.data.map((s) => `${s.id}[${s.status}]`),
      canceladaPorSistema,
      veredicto: "",
    };

    if (pagadas.length >= 3) {
      row.veredicto = `BAJA INDEBIDA — pago ${pagadas.length} cuotas ($${montoPagado})`;
      victimas.push(row);
    } else if (pagadas.length > 0) {
      row.veredicto = `REVISAR — solo ${pagadas.length} factura(s) pagada(s)`;
      revisar.push(row);
    }
  }

  const fmt = (v: Victima) =>
    `  ${v.startup.padEnd(24)} ${v.email.padEnd(32)} ` +
    `pagadas=${String(v.facturasPagadas).padEnd(2)} $${String(v.montoPagadoUSD).padEnd(7)} ` +
    `total_cuotas=${v.totalCuotas ?? "VACIO"} status="${v.paymentStatus}" ultimo=${v.ultimoPago}`;

  console.log(`\n--- VICTIMAS DEL BUG (${victimas.length}) — reactivar ---`);
  if (!victimas.length) console.log("  (ninguna)");
  victimas.forEach((v) => console.log(fmt(v)));

  console.log(`\n--- REVISAR A MANO (${revisar.length}) — pagaron menos de 3 ---`);
  if (!revisar.length) console.log("  (ninguna)");
  revisar.forEach((v) => console.log(fmt(v)));

  const out = "scratch-victimas-cuota4.json";
  fs.writeFileSync(out, JSON.stringify({ mode: MODE, victimas, revisar }, null, 2));
  console.log(`\nJSON escrito en ${out}`);
  console.log(`\nTotal cobrado a founders dados de baja: $${victimas.reduce((s, v) => s + v.montoPagadoUSD, 0)}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

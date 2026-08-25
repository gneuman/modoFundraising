/**
 * READ-ONLY. Sin Stripe: usa la tabla PAGOS de Airtable como fuente de verdad.
 *
 * Cada cobro exitoso escribe un registro en Pagos (createPagoRecord, desde el
 * webhook de Stripe). Asi que contar pagos por email equivale a contar facturas
 * pagadas, sin necesidad de la llave de Stripe.
 *
 * Clasifica CADA postulacion dada de baja para decidir si se reactiva:
 *   REACTIVAR       -> pago >= 3 cuotas (o completo su plan). Baja indebida.
 *   REACTIVAR (4)   -> pago 4. Victima segura del bug de la cuota 4.
 *   NO REACTIVAR    -> 0 o 1 pagos. Moroso real.
 *   REVISAR         -> 2 pagos, o inconsistencia entre Pagos y payment_status.
 *
 * Uso: npx tsx scripts/audit-churn-por-pagos.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getAllApplications, getAllPagos } from "../src/lib/airtable";
import * as fs from "fs";

const cuotaDe = (s?: string) =>
  parseInt((s ?? "").match(/Cuota (\d+) pagada/)?.[1] ?? "0", 10);

async function main() {
  const [apps, pagos] = await Promise.all([getAllApplications(), getAllPagos()]);

  console.log(`\n=== Auditoria de bajas segun tabla PAGOS (sin Stripe) ===\n`);
  console.log(`Postulaciones: ${apps.length} · Registros en Pagos: ${pagos.length}\n`);

  // Agrupar pagos por email
  const porEmail = new Map<string, { cuotas: Set<number>; monto: number; ultimo: string }>();
  for (const p of pagos) {
    const e = (p.email ?? "").toLowerCase().trim();
    if (!e) continue;
    const cur = porEmail.get(e) ?? { cuotas: new Set<number>(), monto: 0, ultimo: "" };
    if (typeof p.cuota === "number") cur.cuotas.add(p.cuota);
    cur.monto += p.amount ?? 0;
    const f = (p.paid_at ?? "").slice(0, 10);
    if (f > cur.ultimo) cur.ultimo = f;
    porEmail.set(e, cur);
  }

  // Toda postulacion SIN acceso al portal: Churn, Churn By Founder, o portal_access apagado
  const dadasDeBaja = apps.filter(
    (a) =>
      a.email &&
      (a.status === "Churn" ||
        a.status === "Churn By Founder" ||
        (a.portal_access === false && a.payment_status)),
  );

  console.log(`Postulaciones sin acceso al portal: ${dadasDeBaja.length}\n`);

  const reactivar: string[] = [];
  const revisar: string[] = [];
  const noReactivar: string[] = [];
  const jsonReactivar: object[] = [];

  for (const a of dadasDeBaja) {
    const e = a.email!.toLowerCase().trim();
    const info = porEmail.get(e);
    const nPagos = info ? info.cuotas.size : 0;
    const maxCuota = info && info.cuotas.size ? Math.max(...info.cuotas) : 0;
    // El mayor entre lo que dice Pagos y lo que dice payment_status
    const pagadas = Math.max(nPagos, maxCuota, cuotaDe(a.payment_status));
    const total = a.total_cuotas ?? 3;
    const monto = info?.monto ?? 0;

    const linea =
      `  ${(a.startup_name ?? "—").slice(0, 24).padEnd(24)} ${(a.email ?? "").padEnd(34)} ` +
      `pagos=${pagadas}/${total} $${String(monto).padEnd(6)} ` +
      `estado="${a.status}" status_pago="${a.payment_status ?? "—"}" ` +
      `total_cuotas=${a.total_cuotas ?? "VACIO"} ultimo=${info?.ultimo ?? "—"}`;

    if (a.status === "Churn By Founder") {
      // Se dio de baja el mismo: NO tocar aunque haya pagado todo.
      noReactivar.push(linea + "   [baja voluntaria — respetar]");
      continue;
    }

    if (pagadas >= 4 || (pagadas >= total && pagadas > 0)) {
      reactivar.push(linea + `   <<< REACTIVAR (completo su plan)`);
      jsonReactivar.push({ postulacionId: a.id, startup: a.startup_name, email: a.email, pagadas, total });
    } else if (pagadas >= 3) {
      reactivar.push(linea + `   <<< REACTIVAR (pago 3+)`);
      jsonReactivar.push({ postulacionId: a.id, startup: a.startup_name, email: a.email, pagadas, total });
    } else if (pagadas === 2) {
      revisar.push(linea + `   ?? REVISAR (pago 2)`);
    } else {
      noReactivar.push(linea + `   -- moroso real (${pagadas} pago/s)`);
    }
  }

  console.log(`--- REACTIVAR (${reactivar.length}) ---`);
  reactivar.length ? reactivar.forEach((l) => console.log(l)) : console.log("  (ninguna)");

  console.log(`\n--- REVISAR A MANO (${revisar.length}) ---`);
  revisar.length ? revisar.forEach((l) => console.log(l)) : console.log("  (ninguna)");

  console.log(`\n--- NO REACTIVAR (${noReactivar.length}) ---`);
  noReactivar.length ? noReactivar.forEach((l) => console.log(l)) : console.log("  (ninguna)");

  fs.writeFileSync("scratch-reactivar.json", JSON.stringify(jsonReactivar, null, 2));
  console.log(`\nJSON con los a reactivar: scratch-reactivar.json (${jsonReactivar.length})\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });

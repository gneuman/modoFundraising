/**
 * READ-ONLY. Quien esta en riesgo por total_cuotas VACIO.
 *
 * Vacio = el sistema asume 3. Si el plan real es de 4, al cobrar la 3a el
 * webhook cancela la suscripcion (nunca se cobra la 4a) y el founder queda
 * expuesto a la baja indebida.
 *
 * Uso: npx tsx scripts/audit-riesgo-cuota4.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getAllApplications, getAllPagos } from "../src/lib/airtable";

const cuotaDe = (s?: string) =>
  parseInt((s ?? "").match(/Cuota (\d+) pagada/)?.[1] ?? "0", 10);

async function main() {
  const [apps, pagos] = await Promise.all([getAllApplications(), getAllPagos()]);

  const pagosPorEmail = new Map<string, { n: number; monto: number; ultimo: string; montos: Set<number> }>();
  for (const p of pagos) {
    const e = (p.email ?? "").toLowerCase().trim();
    if (!e) continue;
    const c = pagosPorEmail.get(e) ?? { n: 0, monto: 0, ultimo: "", montos: new Set<number>() };
    c.n += 1;
    c.monto += p.amount ?? 0;
    if (p.amount) c.montos.add(Math.round(p.amount));
    const f = (p.paid_at ?? "").slice(0, 10);
    if (f > c.ultimo) c.ultimo = f;
    pagosPorEmail.set(e, c);
  }

  const inscritas = apps.filter(
    (a) => a.email && (a.status === "Inscrita" || a.status === "Invitada institucional"),
  );

  console.log(`\n=== Riesgo por total_cuotas VACIO — ${inscritas.length} inscritas ===\n`);

  const criticas: string[] = [];   // 3 pagos + total_cuotas vacio -> sub ya cancelada
  const vigilar: string[] = [];    // total_cuotas vacio, aun no llegan a 3
  const ok: string[] = [];

  for (const a of inscritas) {
    const e = a.email!.toLowerCase().trim();
    const info = pagosPorEmail.get(e);
    const n = info?.n ?? 0;
    const pagadas = Math.max(n, cuotaDe(a.payment_status));
    const vacio = a.total_cuotas == null;
    const montoUnit = info && info.montos.size ? [...info.montos][0] : 0;

    const linea =
      `  ${(a.startup_name ?? "—").slice(0, 22).padEnd(22)} ${(a.email ?? "").padEnd(32)} ` +
      `pagos=${pagadas} total_cuotas=${a.total_cuotas ?? "VACIO"} ` +
      `$${String(info?.monto ?? 0).slice(0, 7).padEnd(7)} unit=$${montoUnit} ultimo=${info?.ultimo ?? "—"}`;

    if (vacio && pagadas >= 3) criticas.push(linea + "  <<< SUB YA CANCELADA por el sistema");
    else if (vacio && pagadas > 0) vigilar.push(linea);
    else ok.push(linea);
  }

  console.log(`--- CRITICAS (${criticas.length}): pagaron 3 con total_cuotas vacio ---`);
  console.log(`    Si su plan era de 4, la 4a cuota YA NO se va a cobrar.\n`);
  criticas.length ? criticas.forEach((l) => console.log(l)) : console.log("  (ninguna)");

  console.log(`\n--- VIGILAR (${vigilar.length}): total_cuotas vacio, aun no llegan a 3 ---`);
  vigilar.length ? vigilar.forEach((l) => console.log(l)) : console.log("  (ninguna)");

  console.log(`\n--- Con total_cuotas definido (${ok.length}) ---`);
  ok.slice(0, 10).forEach((l) => console.log(l));
  if (ok.length > 10) console.log(`  ... y ${ok.length - 10} mas`);
  console.log();
}

main().catch((e) => { console.error(e); process.exit(1); });

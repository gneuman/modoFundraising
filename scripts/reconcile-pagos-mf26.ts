/**
 * Reconciliar los 8 pagos negociados manualmente de la cohorte MF26.
 *
 * Para cada entrada:
 *  1. Encuentra la postulación por startup_name (match difuso, normaliza acentos).
 *  2. Setea total_cuotas en la postulación (4 para cuota, 1 para pago único).
 *  3. Si no existe pago con (startup_name, cuota), crea el record en Pagos MF26.
 *
 * Uso:
 *   npx tsx scripts/reconcile-pagos-mf26.ts --dry-run   # solo logs, no escribe
 *   npx tsx scripts/reconcile-pagos-mf26.ts             # escribe en Airtable
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  getAllApplications,
  getAllPagos,
  createPagoRecord,
  updateApplicationStatus,
  type PostulacionRecord,
} from "../src/lib/airtable";

interface PagoManual {
  startup_name: string;
  amount: number;
  total_cuotas: number;
  payment_status: "Cuota 1 pagada" | "Cuota 2 pagada" | "Cuota 3 pagada" | "Cuota 4 pagada";
}

const PAGOS: PagoManual[] = [
  { startup_name: "Kawesqar Travels",  amount: 224.25, total_cuotas: 4, payment_status: "Cuota 1 pagada" },
  { startup_name: "PIXLAB CLASS",      amount: 224.25, total_cuotas: 4, payment_status: "Cuota 1 pagada" },
  { startup_name: "Maity",             amount: 224.25, total_cuotas: 4, payment_status: "Cuota 1 pagada" },
  { startup_name: "Finsphera",         amount: 279.20, total_cuotas: 4, payment_status: "Cuota 1 pagada" },
  { startup_name: "Antü",              amount: 224.25, total_cuotas: 4, payment_status: "Cuota 1 pagada" },
  { startup_name: "Zeii",              amount: 717.60, total_cuotas: 1, payment_status: "Cuota 1 pagada" },
  { startup_name: "Aventia Solutions", amount: 717.60, total_cuotas: 1, payment_status: "Cuota 1 pagada" },
  { startup_name: "LEAF",              amount: 717.60, total_cuotas: 1, payment_status: "Cuota 1 pagada" },
];

const DRY_RUN = process.argv.includes("--dry-run");

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findApp(target: string, apps: PostulacionRecord[]): PostulacionRecord | null {
  const targetNorm = normalizeName(target);
  const exact = apps.find((a) => normalizeName(a.startup_name ?? "") === targetNorm);
  if (exact) return exact;

  const partial = apps.filter((a) => {
    const n = normalizeName(a.startup_name ?? "");
    return n.includes(targetNorm) || targetNorm.includes(n);
  });
  if (partial.length === 1) return partial[0];

  if (partial.length > 1) {
    console.log(`  → Múltiples candidatos para "${target}":`);
    partial.forEach((a) => console.log(`     - ${a.startup_name} (${a.id})`));
  }
  return null;
}

function pagoSlug(name: string): string {
  return normalizeName(name).replace(/\s+/g, "-");
}

async function main() {
  console.log(`\n${DRY_RUN ? "[DRY-RUN]" : "[ESCRITURA REAL]"} Reconcile pagos MF26\n`);

  const [apps, pagos] = await Promise.all([getAllApplications(), getAllPagos()]);
  console.log(`Cargadas ${apps.length} postulaciones y ${pagos.length} pagos.\n`);

  const resumen = { creados: 0, yaExistentes: 0, noEncontrados: 0, cuotaActualizada: 0 };

  for (const item of PAGOS) {
    console.log(`▸ ${item.startup_name} (US$${item.amount}, 1/${item.total_cuotas})`);

    const app = findApp(item.startup_name, apps);
    if (!app || !app.id) {
      console.log(`  ✗ NO ENCONTRADA en Postulaciones MF26`);
      resumen.noEncontrados++;
      continue;
    }
    console.log(`  ✓ App: ${app.startup_name} (${app.id}) — status: ${app.status ?? "sin status"}`);

    const startupRecordId = (app.startup_record as string[] | undefined)?.[0];
    if (!startupRecordId) {
      console.log(`  ✗ No tiene startup_record linked`);
      resumen.noEncontrados++;
      continue;
    }

    // 1. Actualizar total_cuotas + payment_status si cambió
    const needsTotalCuotasUpdate = app.total_cuotas !== item.total_cuotas;
    const needsPaymentStatusUpdate = app.payment_status !== item.payment_status;
    if (needsTotalCuotasUpdate || needsPaymentStatusUpdate) {
      const patch: Partial<PostulacionRecord> = {};
      if (needsTotalCuotasUpdate) patch.total_cuotas = item.total_cuotas;
      if (needsPaymentStatusUpdate) patch.payment_status = item.payment_status;
      console.log(`  → Patch postulación:`, patch);
      if (!DRY_RUN) {
        await updateApplicationStatus(app.id, app.status ?? "Inscrita", patch);
      }
      resumen.cuotaActualizada++;
    }

    // 2. Crear pago si no existe ya
    const cuotaActual = parseInt(item.payment_status.match(/Cuota (\d+)/)![1], 10);
    const pagoExiste = pagos.some(
      (p) =>
        normalizeName(p.startup_name ?? "") === normalizeName(item.startup_name) &&
        p.cuota === cuotaActual,
    );

    if (pagoExiste) {
      console.log(`  → Pago cuota ${cuotaActual} ya existe en Pagos MF26 (no se crea duplicado)`);
      resumen.yaExistentes++;
    } else {
      const stripeInvoiceId = `manual-mf26-${pagoSlug(item.startup_name)}-c${cuotaActual}`;
      console.log(`  → Crear pago: cuota ${cuotaActual}, monto ${item.amount}, invoice "${stripeInvoiceId}"`);
      if (!DRY_RUN) {
        await createPagoRecord({
          postulacionId: app.id,
          startupRecordId,
          email: app.email ?? "",
          startup_name: app.startup_name ?? "",
          cuota: cuotaActual,
          amount: item.amount,
          stripe_invoice_id: stripeInvoiceId,
        });
      }
      resumen.creados++;
    }

    console.log();
  }

  console.log("\n── Resumen ──");
  console.log(`  Pagos creados:       ${resumen.creados}`);
  console.log(`  Pagos ya existentes: ${resumen.yaExistentes}`);
  console.log(`  Postulaciones con cuota/total actualizado: ${resumen.cuotaActualizada}`);
  console.log(`  No encontrados:      ${resumen.noEncontrados}`);
  if (DRY_RUN) console.log(`\n  (DRY-RUN — no se escribió nada. Correr sin --dry-run para aplicar.)\n`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});

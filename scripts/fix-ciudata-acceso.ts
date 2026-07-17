/**
 * OP-2155 — Fix puntual de acceso para Ciudata.
 *
 * Ciudata quedó en estado inconsistente tras la anomalía de doble-suscripción:
 * postulación Inscrita + Cuota 3 pagada + sub Stripe viva, PERO startup=Churn y
 * todos los founders con portal_access=false → el cron sync-attendees no los
 * agenda y no pueden entrar al portal. Además brissia perdió el link a la startup.
 *
 * Este script (idempotente) reactiva SOLO los founders buenos, religa a brissia,
 * pone la startup en Inscrita y prende portal_access en la postulación. NO toca
 * Stripe (la sub ya está viva y pagada). NO toca los founder records duplicados
 * (higiene de datos aparte).
 *
 * Uso:
 *   npx tsx scripts/fix-ciudata-acceso.ts            (dry-run: solo muestra)
 *   npx tsx scripts/fix-ciudata-acceso.ts --apply    (aplica los cambios)
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const FOUNDERS = "tblTif15ehnRN4K74";
const STARTUPS = "tblBv45W1M9ZITEpe";
const POSTULACIONES = "tblqj2eJMHpEqLxqv";

const APPLY = process.argv.includes("--apply");

// Records BUENOS identificados en el diagnóstico (los ligados a Ciudata / con
// invitado_calendar_at del 7-jul). Los duplicados huérfanos NO se tocan.
const CIUDATA_STARTUP = "recBEK2OHONfV1N99";
const CIUDATA_POSTULACION = "recydTkAjSk7erY9T";
const FOUNDERS_BUENOS = [
  { id: "rechZFnbzjgIrU4dB", email: "camila@ciudata.io" },
  { id: "recD3xMniru2bgXj9", email: "diego@ciudata.io" },
  { id: "rec3wYjkK2V7L9PtD", email: "brissia@ciudata.io" }, // el más completo; se religa
];
const BRISSIA_A_RELIGAR = "rec3wYjkK2V7L9PtD";

async function patch(table: string, id: string, fields: Record<string, unknown>) {
  if (!APPLY) {
    console.log(`  [dry-run] PATCH ${table}/${id}:`, JSON.stringify(fields));
    return;
  }
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${table}/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) throw new Error(`PATCH ${table}/${id}: ${res.status} ${await res.text()}`);
  console.log(`  ✅ PATCH ${table}/${id} OK`);
}

async function main() {
  console.log(`=== Fix Ciudata acceso (OP-2155) — ${APPLY ? "APPLY" : "DRY-RUN"} ===\n`);

  console.log("1. portal_access=true en founders buenos:");
  for (const f of FOUNDERS_BUENOS) {
    console.log(`   ${f.email} [${f.id}]`);
    await patch(FOUNDERS, f.id, { portal_access: true });
  }

  console.log("\n2. Religar brissia buena a la startup Ciudata:");
  await patch(FOUNDERS, BRISSIA_A_RELIGAR, { "Startups MF26": [CIUDATA_STARTUP] });

  console.log("\n3. Startup Ciudata: status Churn → Inscrita:");
  await patch(STARTUPS, CIUDATA_STARTUP, { status: "Inscrita" });

  console.log("\n4. Postulación: portal_access=true:");
  await patch(POSTULACIONES, CIUDATA_POSTULACION, { portal_access: true });

  console.log(`\n${APPLY ? "✅ Aplicado." : "(dry-run — nada cambió)"}`);
  console.log("Nota: el cron sync-attendees los reagenda al tener portal_access=1.");
  console.log("Duplicados de diego/brissia NO tocados (ticket de higiene aparte).");
}
main().catch((e) => { console.error(e); process.exit(1); });

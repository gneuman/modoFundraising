/**
 * Fix one-shot: apaga portal_access en founders HUÉRFANOS y los saca del calendario.
 *
 * Un huérfano = founder con portal_access=true cuyo status de Postulación NO otorga
 * acceso al programa (allowlist STATUS_CON_ACCESO en airtable.ts). Ejemplos reales:
 * "Rechazada por founder", "Money Back", "Churn". Estos flags sucios metían
 * invitaciones fantasma al calendario (OP-1939).
 *
 * Fuente de verdad: portal_access del Founder. Este script SOLO:
 *   - pone portal_access=false en el founder huérfano (Airtable)
 *   - lo saca de TODOS los eventos del programa (Google Calendar)
 * NO cancela Stripe, NO toca status, NO manda emails. Reversible.
 *
 * Uso:
 *   npx tsx scripts/fix-portal-access-huerfanos.ts            # DRY-RUN (default): solo reporta
 *   npx tsx scripts/fix-portal-access-huerfanos.ts --apply    # aplica los cambios
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  auditFoundersConAcceso,
  updateFounderAccess,
  getCalendarEventIds,
} from "../src/lib/airtable";
import { removeAttendeesFromAllEvents } from "../src/lib/calendar";

const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(APPLY ? "🔧 MODO APPLY — se aplicarán cambios\n" : "🔍 DRY-RUN — solo reporta, no toca nada (usa --apply para aplicar)\n");

  const { total, huerfanos, sinStatus } = await auditFoundersConAcceso();
  console.log(`Founders con portal_access=true: ${total}`);
  console.log(`Huérfanos detectados: ${huerfanos.length}`);
  console.log(`Sin status resoluble (revisión manual, NO se tocan): ${sinStatus.length}\n`);

  if (sinStatus.length) {
    console.log("── Sin status (excluidos del fix) ──");
    for (const s of sinStatus) console.log(`  ? ${s.email} | startups ligadas: ${s.startupsLinked}`);
    console.log("");
  }

  if (!huerfanos.length) {
    console.log("✅ No hay huérfanos. Nada que corregir.");
    return;
  }

  console.log("── Huérfanos (portal_access=true + status sin acceso) ──");
  for (const h of huerfanos) {
    const enCal = h.invitadoCalendarAt ? "📅 EN CALENDARIO" : "— (no marcado en calendar)";
    console.log(`  ✗ ${h.email}`);
    console.log(`     status: "${h.status}" | ${enCal} | invitó: ${h.invitadoCalendarBy ?? "—"}`);
  }
  console.log("");

  if (!APPLY) {
    console.log("DRY-RUN: no se aplicó nada. Revisa la lista de arriba y corre con --apply para ejecutar.");
    return;
  }

  // Aplicar. Paso 1: apagar portal_access de cada huérfano (Airtable).
  for (const h of huerfanos) {
    try {
      await updateFounderAccess(h.id, false);
      console.log(`  ✅ ${h.email} — portal_access=false`);
    } catch (err) {
      console.error(`  ❌ ${h.email} — portal_access ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Paso 2: sacar a TODOS los huérfanos del calendario en un solo barrido serial
  // (un PATCH por evento con todos los emails). Evita los patches concurrentes que
  // se pisaban y dejaban gente dentro (bug detectado en la primera corrida OP-1939).
  const eventIds = await getCalendarEventIds();
  const emails = huerfanos.map((h) => h.email);
  console.log(`\nSacando ${emails.length} founders de ${eventIds.length} eventos (serial)...`);
  const { totalRemoved, perEvent } = await removeAttendeesFromAllEvents(eventIds, emails);
  const conError = perEvent.filter((e) => e.error);
  console.log(`  Removidos (attendee-evento): ${totalRemoved} | eventos con error: ${conError.length}`);
  for (const e of conError) console.log(`    ⚠️ ${e.eventId}: ${e.error}`);

  console.log("\n✅ Fix aplicado. Verificar en Google Calendar que desaparecieron de las clases futuras.");
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

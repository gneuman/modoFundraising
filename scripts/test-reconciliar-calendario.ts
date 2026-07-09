/**
 * Dry-run del cron /api/cron/reconciliar-calendario SIN levantar el server ni
 * tocar nada. Ejecuta la misma lógica y reporta a quién SACARÍA del calendario.
 *
 * Un attendee se saca si: es founder (existe en Founders) Y portal_access=false.
 * A los no-founders (staff, instructores, organizador) nunca los toca.
 *
 * Uso: npx tsx scripts/test-reconciliar-calendario.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  getAllFounderEmailsWithAccessFlag,
  getUpcomingClaseEventIds,
} from "../src/lib/airtable";
import { getAttendeesAcrossEvents } from "../src/lib/calendar";

async function main() {
  const [allFounders, eventos] = await Promise.all([
    getAllFounderEmailsWithAccessFlag(),
    getUpcomingClaseEventIds(),
  ]);

  const eventIds = eventos.map((e) => e.eventId).filter(Boolean);
  console.log(`Clases futuras: ${eventIds.length}`);
  console.log(`Founders totales: ${allFounders.length} (con acceso: ${allFounders.filter((f) => f.portalAccess).length})\n`);

  if (!eventIds.length) {
    console.log("No hay clases futuras. Nada que reconciliar.");
    return;
  }

  const founderAccess = new Map<string, boolean>();
  for (const f of allFounders) founderAccess.set(f.email, f.portalAccess);

  const { byEmail, errors } = await getAttendeesAcrossEvents(eventIds);
  console.log(`Attendees únicos en el calendario: ${byEmail.size}`);
  if (errors.length) console.log(`⚠️ Eventos que no se pudieron leer: ${errors.length}`);

  // A sacar: es founder con portal_access=false.
  const aSacar = [...byEmail.keys()].filter((email) => founderAccess.get(email) === false);

  // Info extra: attendees que NO son founders (se dejan en paz) — para que veas
  // que no se tocan por error (staff/instructores/organizador).
  const noFounders = [...byEmail.keys()].filter((email) => !founderAccess.has(email));

  console.log(`\n══ SACARÍA (founder sin portal_access): ${aSacar.length} ══`);
  for (const email of aSacar) {
    console.log(`  ✗ ${email} — en ${byEmail.get(email)?.length ?? 0} eventos`);
  }
  if (!aSacar.length) console.log("  ✅ Nadie. El calendario está alineado con portal_access.");

  console.log(`\n── No se tocan (no son founders, ${noFounders.length}) ──`);
  for (const email of noFounders) console.log(`  · ${email}`);

  console.log(`\nDRY-RUN: no se aplicó ningún cambio.`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

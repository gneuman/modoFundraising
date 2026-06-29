/**
 * Prueba la invitacion al calendar a un email arbitrario.
 * - Si ya esta como attendee, primero lo quita (sendUpdates=none = silencioso).
 * - Luego lo vuelve a agregar (sendUpdates=all = Google le manda invitacion a cada uno de los 26 eventos).
 * Asi forzamos que reciba la invitacion fresca en el inbox para verificar el flujo.
 *
 * Uso: npx tsx scripts/test-invite-calendar.ts <email> [--dry-run]
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getCalendarEventIds } from "@/lib/airtable";
import { addAttendeesToAllEvents, removeAttendeeFromAllEvents } from "@/lib/calendar";

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  const dry = args.includes("--dry-run");
  if (!email || !/.+@.+\..+/.test(email)) {
    console.error("Uso: npx tsx scripts/test-invite-calendar.ts <email> [--dry-run]");
    process.exit(1);
  }

  const eventIds = await getCalendarEventIds();
  console.log(`[test-invite] email=${email} eventos=${eventIds.length} dry=${dry}\n`);

  if (!eventIds.length) {
    console.error("No hay eventos con calendar_event_id. Aborto.");
    process.exit(1);
  }

  if (dry) {
    console.log(`DRY-RUN: removeria a ${email} de ${eventIds.length} eventos (silencioso),`);
    console.log(`         luego lo agregaria a los ${eventIds.length} eventos (Google manda ${eventIds.length} mails).`);
    return;
  }

  console.log(`-> Paso 1: removiendo a ${email} de los ${eventIds.length} eventos (silencioso, sendUpdates=none)...`);
  await removeAttendeeFromAllEvents(eventIds, email);
  console.log(`   OK removido (si estaba) sin notificar.`);

  console.log(`\n-> Paso 2: agregando a ${email} a los ${eventIds.length} eventos (sendUpdates=all, Google manda invitacion por evento)...`);
  const result = await addAttendeesToAllEvents(eventIds, [email]);
  console.log(`   ok=${result.ok.length} failed=${result.failed.length} skipped=${result.skipped.length}`);
  if (result.failed.length) {
    console.log(`   primeros fallos:`);
    for (const f of result.failed.slice(0, 5)) {
      console.log(`     ${f.eventId}: ${f.error}`);
    }
  }

  console.log(`\nLISTO. ${email} deberia recibir ${result.ok.length} invitaciones de Google Calendar en su inbox.`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

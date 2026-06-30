/**
 * Borra una clase TEST y sus eventos de Google Calendar.
 *
 * Pensado como complemento de test-clase-upsert.ts. Toma el recordId que
 * imprimió ese script, lee calendar_event_id y calendar_event_id_team de
 * Airtable, borra los dos eventos de Calendar y después borra el record.
 *
 * Por seguridad solo procede si el título empieza con "TEST " (todo mayúsculas).
 * Si querés forzar pasá --force (úsalo con cuidado).
 *
 * Uso:
 *   npx tsx scripts/cleanup-clase-test.ts --apply --recordId=recXXX
 *   npx tsx scripts/cleanup-clase-test.ts --apply --recordId=recXXX --force
 */
import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const recordArg = process.argv.find((a) => a.startsWith("--recordId="));
const RECORD_ID = recordArg ? recordArg.split("=")[1] : undefined;

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const CLASES_TABLE_ID = "tblHRJ35xMM3rQa85";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

function getOAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

async function main() {
  if (!RECORD_ID) {
    console.error("❌ Falta --recordId=recXXX");
    console.error("Uso: npx tsx scripts/cleanup-clase-test.ts --apply --recordId=recXXX");
    process.exit(1);
  }

  console.log("─".repeat(60));
  console.log(`CLEANUP clase TEST · ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`recordId: ${RECORD_ID}`);
  console.log("─".repeat(60));

  const record = await base(CLASES_TABLE_ID).find(RECORD_ID).catch(() => null);
  if (!record) {
    console.error(`❌ Record ${RECORD_ID} no existe en Clases MF26`);
    process.exit(1);
  }
  const f = record.fields as Record<string, unknown>;
  const titulo = (f.titulo as string) ?? "";
  const calendarEventId = (f.calendar_event_id as string) ?? "";
  const calendarEventIdTeam = (f.calendar_event_id_team as string) ?? "";

  console.log(`\nClase encontrada:`);
  console.log(`  titulo: ${titulo}`);
  console.log(`  calendar_event_id: ${calendarEventId || "(vacío)"}`);
  console.log(`  calendar_event_id_team: ${calendarEventIdTeam || "(vacío)"}`);

  if (!titulo.startsWith("TEST ") && !FORCE) {
    console.error(`\n❌ El titulo NO empieza con "TEST ".`);
    console.error(`   Esto bloquea borrar clases reales por accidente.`);
    console.error(`   Si estás seguro, pasá --force.`);
    process.exit(1);
  }

  if (!APPLY) {
    console.log("\nDRY-RUN — corré con --apply para borrar de verdad.");
    return;
  }

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  // ─── Borrar eventos Calendar ─────────────────────────────────────────────
  if (calendarEventId) {
    try {
      await calendar.events.delete({
        calendarId: CALENDAR_ID,
        eventId: calendarEventId,
        sendUpdates: "all",
      });
      console.log(`✅ Evento Founders borrado: ${calendarEventId}`);
    } catch (e) {
      console.warn(`⚠️ No pude borrar evento Founders ${calendarEventId}:`, e instanceof Error ? e.message : e);
    }
  }
  if (calendarEventIdTeam) {
    try {
      await calendar.events.delete({
        calendarId: CALENDAR_ID,
        eventId: calendarEventIdTeam,
        sendUpdates: "all",
      });
      console.log(`✅ Evento Equipo borrado: ${calendarEventIdTeam}`);
    } catch (e) {
      console.warn(`⚠️ No pude borrar evento Equipo ${calendarEventIdTeam}:`, e instanceof Error ? e.message : e);
    }
  }

  // ─── Borrar record de Airtable ───────────────────────────────────────────
  await base(CLASES_TABLE_ID).destroy(RECORD_ID);
  console.log(`✅ Record Airtable borrado: ${RECORD_ID}`);

  console.log("\nCleanup completo.");
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

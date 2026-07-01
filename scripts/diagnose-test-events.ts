/**
 * Diagnóstico: lista todos los records TEST en Airtable + eventos en Calendar
 * con título que empiece con TEST del día actual.
 *
 * Uso: npx tsx scripts/diagnose-test-events.ts
 */
import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

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
  console.log("─".repeat(60));
  console.log("DIAGNÓSTICO — records TEST + eventos TEST del día");
  console.log("─".repeat(60));

  // ─── Airtable: records TEST ───────────────────────────────────────────────
  console.log("\n📋 Records en Airtable con titulo LIKE 'TEST%':\n");
  const records = await base(CLASES_TABLE_ID)
    .select({
      filterByFormula: `LEFT({titulo}, 5) = "TEST "`,
      fields: [
        "titulo",
        "fecha",
        "calendar_event_id",
        "calendar_event_id_team",
        "listo_publicar",
      ],
      sort: [{ field: "fecha", direction: "desc" }],
    })
    .all();

  if (!records.length) console.log("  (ninguno)");
  for (const r of records) {
    const f = r.fields as Record<string, unknown>;
    console.log(`  ${r.id}`);
    console.log(`    titulo:            ${f.titulo}`);
    console.log(`    fecha:             ${f.fecha}`);
    console.log(`    calendar_event_id:      ${f.calendar_event_id || "(vacío)"}`);
    console.log(`    calendar_event_id_team: ${f.calendar_event_id_team || "(vacío)"}`);
    console.log(`    listo_publicar:    ${f.listo_publicar ?? false}`);
    console.log();
  }

  // ─── Calendar: eventos con título TEST creados hoy ────────────────────────
  console.log(`\n📅 Eventos en Calendar '${CALENDAR_ID}' con titulo LIKE 'TEST%' o '[Equipo] TEST%':\n`);
  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  const start = new Date();
  start.setDate(start.getDate() - 1);
  const end = new Date();
  end.setDate(end.getDate() + 7);

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    q: "TEST",
    maxResults: 50,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = (res.data.items ?? []).filter((e) =>
    (e.summary ?? "").includes("TEST"),
  );

  if (!events.length) console.log("  (ninguno)");
  for (const e of events) {
    console.log(`  ${e.id}`);
    console.log(`    summary:  ${e.summary}`);
    console.log(`    start:    ${e.start?.dateTime ?? e.start?.date}`);
    console.log(`    created:  ${e.created}`);
    console.log(`    attendees: ${(e.attendees ?? []).map((a) => a.email).join(", ") || "(ninguno)"}`);
    console.log();
  }

  console.log("─".repeat(60));
  console.log(`Total records Airtable TEST: ${records.length}`);
  console.log(`Total eventos Calendar TEST: ${events.length}`);
  console.log("─".repeat(60));
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

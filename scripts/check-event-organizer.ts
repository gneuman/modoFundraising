/**
 * Diagnóstico: ¿Quién es el organizer de los eventos del calendario?
 * Uso: npx tsx scripts/check-event-organizer.ts
 */

import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

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
  const records = await base("Clases MF26")
    .select({
      fields: ["titulo", "fecha", "calendar_event_id"],
      filterByFormula: `{calendar_event_id} != ""`,
      sort: [{ field: "fecha", direction: "asc" }],
      maxRecords: 2,
    })
    .all();

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  for (const r of records) {
    const f = r.fields as Record<string, unknown>;
    const eventId = f.calendar_event_id as string;
    const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
    const ev = res.data;
    console.log("─".repeat(60));
    console.log(`Clase: ${f.titulo}`);
    console.log(`Event ID: ${eventId}`);
    console.log(`Organizer:`, ev.organizer);
    console.log(`Creator:`, ev.creator);
    console.log(`Attendees count:`, ev.attendees?.length ?? 0);
  }

  // También vemos el calendar metadata
  const calMeta = await calendar.calendars.get({ calendarId: CALENDAR_ID });
  console.log("─".repeat(60));
  console.log(`Calendar:`, { id: calMeta.data.id, summary: calMeta.data.summary });
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});

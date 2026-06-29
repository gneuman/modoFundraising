/**
 * Diagnóstico previo a migrar al calendar primario.
 * Cuenta: cuántos founders con portal_access ya están invitados a los eventos.
 * Uso: npx tsx scripts/count-founders-invited.ts
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
  // Founders con portal_access
  const founders = await base("Founders MF26")
    .select({ filterByFormula: `{portal_access} = 1`, fields: ["email", "first_name", "last_name"] })
    .all();

  console.log(`Founders con portal_access: ${founders.length}`);
  for (const f of founders) {
    const fields = f.fields as Record<string, unknown>;
    console.log(`  - ${fields.email} (${fields.first_name} ${fields.last_name})`);
  }

  // Eventos del calendar actual
  const records = await base("Clases MF26")
    .select({ fields: ["titulo", "calendar_event_id"], filterByFormula: `{calendar_event_id} != ""` })
    .all();

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  // Tomamos UN evento como muestra (todos suelen tener los mismos attendees)
  const sample = records[0];
  const sampleEventId = (sample.fields as Record<string, unknown>).calendar_event_id as string;
  const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: sampleEventId });
  const attendees = ev.data.attendees ?? [];

  console.log(`\nAttendees en muestra "${(sample.fields as Record<string, unknown>).titulo}":`);
  console.log(`  Total: ${attendees.length}`);
  for (const a of attendees) {
    console.log(`  - ${a.email} (${a.responseStatus})`);
  }

  console.log(`\nEventos totales: ${records.length}`);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});

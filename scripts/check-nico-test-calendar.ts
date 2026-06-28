import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

function getOAuth() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

const IDS = [
  "recu5k2irwRmElOeu", // David
  "recBmSJYoWsk3SgyT", // Gabriel neumang
  "recMVLn7MdW1k6n8u", // Nicole
];

async function main() {
  console.log("=== AIRTABLE: campos de invitacion al calendar ===\n");
  for (const id of IDS) {
    const r = await base("Founders MF26").find(id).catch(() => null);
    if (!r) { console.log(`  ${id}: NO encontrado`); continue; }
    const f = r.fields as any;
    console.log(`  ${id} | ${f.email} | ${f.first_name}`);
    console.log(`    portal_access=${f.portal_access === true}`);
    console.log(`    onboarding_enviado_at=${f.onboarding_enviado_at ?? "(vacio)"}`);
    console.log(`    invitado_calendar_at=${f.invitado_calendar_at ?? "(vacio)"}`);
    console.log(`    invitado_calendar_by=${f.invitado_calendar_by ?? "(vacio)"}`);
  }

  console.log("\n=== CALENDAR: aparecen como attendees en S1 (Clase 1)? ===\n");
  const clase1 = await base("Clases MF26")
    .select({ fields: ["titulo", "calendar_event_id"], sort: [{ field: "fecha" }], maxRecords: 1 })
    .all();
  if (!clase1.length) { console.log("  no hay clases"); return; }
  const evId = (clase1[0].fields as any).calendar_event_id;
  if (!evId) { console.log("  Clase 1 sin calendar_event_id"); return; }

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: evId });
  const attendees = ev.data.attendees ?? [];
  console.log(`  Evento: ${ev.data.summary} | total attendees=${attendees.length}`);

  const targetEmails = new Set(["david.alvo@gmail.com", "neumang@gmail.com", "nicolemacchiavello@gmail.com"]);
  for (const a of attendees) {
    if (a.email && targetEmails.has(a.email.toLowerCase())) {
      console.log(`    ATTENDEE: ${a.email} | status=${a.responseStatus}`);
    }
  }
}
main().catch(console.error);

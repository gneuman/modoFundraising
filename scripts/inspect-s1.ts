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

async function main() {
  const clases = await base("Clases MF26")
    .select({ fields: ["titulo", "calendar_event_id"], sort: [{ field: "fecha" }], maxRecords: 1 })
    .all();
  const evId = (clases[0].fields as any).calendar_event_id;
  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: evId });
  console.log("S1 evento completo:");
  console.log("  id:", ev.data.id);
  console.log("  organizer:", JSON.stringify(ev.data.organizer));
  console.log("  creator:", JSON.stringify(ev.data.creator));
  console.log("  attendees:");
  for (const a of ev.data.attendees ?? []) {
    console.log(`    ${JSON.stringify(a)}`);
  }
}
main().catch(console.error);

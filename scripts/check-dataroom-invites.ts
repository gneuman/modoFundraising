/**
 * Diagnostica el evento "Dataroom & Fundraising by Lazo":
 * ¿cuántos founders con portal_access están invitados en el evento de Calendar
 * y cuántos faltan?
 * Uso: npx tsx scripts/check-dataroom-invites.ts
 */
import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);
const EVENT_ID = "8afhshkde90cmjivb1d7mcnct4"; // Founders event de Dataroom & Fundraising by Lazo
const ADMIN_EMAIL = "gnb@teknobuilding.com";

function getOAuth() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

async function main() {
  const foundersRecs = await base("Founders MF26")
    .select({ filterByFormula: `{portal_access} = 1`, fields: ["email", "first_name", "last_name"] })
    .all();
  const founders = foundersRecs
    .map((r) => ({ email: String((r.fields as any).email ?? "").toLowerCase() }))
    .filter((f) => f.email && f.email !== ADMIN_EMAIL.toLowerCase());
  console.log(`Founders con portal_access: ${founders.length}`);

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: EVENT_ID });
  const attendees = new Set((ev.data.attendees ?? []).map((a) => (a.email ?? "").toLowerCase()));
  console.log(`Evento: ${ev.data.summary}`);
  console.log(`  status: ${ev.data.status}`);
  console.log(`  start: ${ev.data.start?.dateTime ?? ev.data.start?.date}`);
  console.log(`  attendees en Calendar: ${attendees.size}\n`);

  const invitados = founders.filter((f) => attendees.has(f.email));
  const faltan = founders.filter((f) => !attendees.has(f.email));

  console.log(`Founders YA invitados: ${invitados.length}`);
  console.log(`Founders que FALTAN: ${faltan.length}\n`);
  if (faltan.length) {
    console.log("=== FALTAN ===");
    for (const f of faltan) console.log(`  ${f.email}`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

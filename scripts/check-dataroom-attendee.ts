import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const EVENT_ID = "8afhshkde90cmjivb1d7mcnct4";

function getOAuth() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

async function main() {
  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: EVENT_ID });
  console.log("summary:", ev.data.summary);
  console.log("organizer:", ev.data.organizer?.email);
  console.log("creator:", ev.data.creator?.email);
  console.log("created:", ev.data.created);
  console.log("updated:", ev.data.updated);
  console.log("\nattendees:");
  for (const a of ev.data.attendees ?? []) {
    console.log(`  ${a.email}  (organizer=${a.organizer ?? false}, self=${a.self ?? false}, status=${a.responseStatus})`);
  }
}
main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

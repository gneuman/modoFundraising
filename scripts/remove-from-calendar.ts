/**
 * Quita un email de los 26 eventos del calendar (silencioso, sendUpdates=none).
 * Uso: npx tsx scripts/remove-from-calendar.ts <email> [--dry-run]
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getCalendarEventIds } from "@/lib/airtable";
import { removeAttendeeFromAllEvents } from "@/lib/calendar";
import { google } from "googleapis";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

function getOAuth() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  const dry = args.includes("--dry-run");
  if (!email) {
    console.error("Uso: npx tsx scripts/remove-from-calendar.ts <email> [--dry-run]");
    process.exit(1);
  }

  const eventIds = await getCalendarEventIds();
  console.log(`[remove] email=${email} eventos=${eventIds.length} dry=${dry}\n`);

  // Verifico cuantos lo tienen como attendee ahora
  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  let presente = 0;
  for (const id of eventIds) {
    try {
      const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: id });
      const attendees = ev.data.attendees ?? [];
      if (attendees.some((a) => a.email?.toLowerCase() === email)) presente++;
    } catch { /* ignore */ }
  }
  console.log(`Antes: ${email} esta en ${presente}/${eventIds.length} eventos.\n`);

  if (dry) {
    console.log(`DRY-RUN: lo removeria de los ${eventIds.length} eventos (sendUpdates=none, sin notificar).`);
    return;
  }

  await removeAttendeeFromAllEvents(eventIds, email);
  console.log(`OK removido (silencioso, sin notificarle).`);

  // Verifico despues
  let presenteDespues = 0;
  for (const id of eventIds) {
    try {
      const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: id });
      const attendees = ev.data.attendees ?? [];
      if (attendees.some((a) => a.email?.toLowerCase() === email)) presenteDespues++;
    } catch { /* ignore */ }
  }
  console.log(`Despues: ${email} queda en ${presenteDespues}/${eventIds.length} eventos.`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

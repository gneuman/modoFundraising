/**
 * Lista los attendees de los eventos "Team" del programa MF26.
 * - No usa Airtable (evita el 403 con el PAT). Va directo a Google Calendar.
 * - Filtra eventos futuros cuyo summary arranca con [Equipo] o [VIP].
 *
 * Uso: npx tsx scripts/list-team-event-attendees.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { google } from "googleapis";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

function getOAuth() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

async function main() {
  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: new Date().toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: "startTime",
  });

  const items = res.data.items ?? [];
  console.log(`\n[team-attendees] eventos futuros TOTALES en calendar "${CALENDAR_ID}": ${items.length}\n`);
  console.log(`Sample de titulos para detectar el prefijo real:`);
  for (const e of items.slice(0, 8)) console.log(`  - "${e.summary}"  (${e.start?.dateTime ?? e.start?.date})`);

  const teamEvents = items.filter((e) => {
    const s = e.summary ?? "";
    return s.startsWith("[Equipo] ") || s.startsWith("[VIP] ") || s.toLowerCase().includes("equipo") || s.toLowerCase().includes("vip");
  });

  console.log(`\n[team-attendees] eventos Team encontrados (match): ${teamEvents.length}\n`);

  for (const e of teamEvents) {
    const start = e.start?.dateTime ?? e.start?.date ?? "?";
    const attendees = e.attendees ?? [];
    console.log(`\n▸ ${e.summary}`);
    console.log(`  fecha: ${start}`);
    console.log(`  eventId: ${e.id}`);
    if (!attendees.length) {
      console.log(`  attendees: (ninguno)`);
      continue;
    }
    console.log(`  attendees (${attendees.length}):`);
    for (const a of attendees) {
      const status = a.responseStatus ?? "?";
      const org = a.organizer ? " [organizador]" : "";
      const self = a.self ? " [self]" : "";
      console.log(`    - ${a.email}  (${status})${org}${self}`);
    }
  }

  // Resumen: emails unicos que aparecen en algun evento Team
  const uniq = new Set<string>();
  for (const e of teamEvents) for (const a of e.attendees ?? []) if (a.email) uniq.add(a.email);
  console.log(`\n─────────────────────────────────`);
  console.log(`Emails únicos que aparecen en algún evento Team: ${uniq.size}`);
  for (const em of [...uniq].sort()) console.log(`  - ${em}`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

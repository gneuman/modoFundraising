/**
 * Agrega nmacchiavello@impacta.vc a TODOS los eventos [VIP] futuros del
 * programa MF26 en Google Calendar.
 *
 * Idempotente: si ya está invitada en un evento, no la duplica.
 * Solo toca eventos cuyo summary arranca con "[VIP] ".
 *
 * Ver también:
 *  - Webhook src/app/api/airtable/clase-upsert/route.ts (TEAM_INVITEES) —
 *    ya incluye a nmacchiavello para eventos NUEVOS.
 *  - Este script es para los eventos existentes al 2026-07-02.
 *
 * Uso: npx tsx scripts/add-nmacchiavello-to-vip.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { google } from "googleapis";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const NEW_INVITEE = "nmacchiavello@impacta.vc";

function getOAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
  );
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
  const vipEvents = items.filter((e) => (e.summary ?? "").startsWith("[VIP] "));

  console.log(`\n[add-nmacchiavello-to-vip] eventos [VIP] futuros: ${vipEvents.length}\n`);

  let added = 0;
  let already = 0;
  let errors = 0;

  for (const e of vipEvents) {
    const start = e.start?.dateTime ?? e.start?.date ?? "?";
    const attendees = e.attendees ?? [];
    const has = attendees.some((a) => a.email?.toLowerCase() === NEW_INVITEE);

    if (has) {
      console.log(`  ✓ ya invitada: ${e.summary}  (${start})`);
      already++;
      continue;
    }

    try {
      await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId: e.id!,
        requestBody: {
          attendees: [...attendees, { email: NEW_INVITEE }],
        },
        sendUpdates: "all",
      });
      console.log(`  + agregada: ${e.summary}  (${start})`);
      added++;
    } catch (err: any) {
      console.error(`  ✗ error en ${e.summary}: ${err?.message ?? err}`);
      errors++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Total eventos [VIP]:  ${vipEvents.length}`);
  console.log(`Agregada:             ${added}`);
  console.log(`Ya estaba:            ${already}`);
  console.log(`Errores:              ${errors}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

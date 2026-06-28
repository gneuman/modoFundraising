/**
 * Agrega un email a los 26 eventos del calendar de forma SERIAL (1 a la vez)
 * con sleep entre patches para evitar rate limit de Google Calendar.
 * - Idempotente: si ya esta como attendee, no hace nada (skipped).
 * - sendUpdates="all" para que Google le mande la invitacion al nuevo attendee.
 * - Despues marca invitado_calendar_at en Airtable.
 *
 * Uso: npx tsx scripts/retry-calendar-serial.ts <email> [--sleep=2000]
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";
import { google } from "googleapis";
import { markFoundersAsInvited } from "@/lib/airtable";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const ADMIN_EMAIL = "gnb@teknobuilding.com";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

function getOAuth() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

function sleep(ms: number) { return new Promise((res) => setTimeout(res, ms)); }

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  const sleepArg = args.find((a) => a.startsWith("--sleep="));
  const sleepMs = sleepArg ? parseInt(sleepArg.slice("--sleep=".length), 10) : 2000;
  if (!email) {
    console.error("Uso: npx tsx scripts/retry-calendar-serial.ts <email> [--sleep=2000]");
    process.exit(1);
  }

  // Resolver founder id por email para marcar invitado_calendar_at despues
  const recs = await base("Founders MF26")
    .select({ filterByFormula: `LOWER({email}) = "${email}"`, maxRecords: 1, fields: ["email"] })
    .firstPage();
  const founderId = recs[0]?.id;
  if (!founderId) console.warn(`(aviso) ${email} no esta en Founders MF26, no podre marcar invitado_calendar_at`);

  // Eventos
  const clases = await base("Clases MF26")
    .select({ fields: ["titulo", "fecha", "calendar_event_id"], filterByFormula: `{calendar_event_id} != ""`, sort: [{ field: "fecha" }] })
    .all();

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  console.log(`[serial] email=${email} eventos=${clases.length} sleep=${sleepMs}ms\n`);

  let ok = 0, skipped = 0, failed = 0;
  const failures: { titulo: string; eventId: string; error: string }[] = [];

  for (let i = 0; i < clases.length; i++) {
    const c = clases[i];
    const f = c.fields as any;
    const eventId = f.calendar_event_id;
    const titulo = f.titulo;
    process.stdout.write(`[${String(i + 1).padStart(2, "0")}/${clases.length}] ${titulo} ... `);
    try {
      const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      const attendees = ev.data.attendees ?? [];
      if (attendees.some((a) => a.email?.toLowerCase() === email)) {
        console.log("SKIP (ya esta)");
        skipped++;
      } else {
        await calendar.events.patch({
          calendarId: CALENDAR_ID,
          eventId,
          sendUpdates: "all",
          requestBody: {
            attendees: [...attendees, { email }],
            guestsCanSeeOtherGuests: false,
            guestsCanInviteOthers: false,
          },
        });
        console.log("OK invitado");
        ok++;
      }
    } catch (err: any) {
      console.log(`FAIL ${err.message ?? err}`);
      failed++;
      failures.push({ titulo, eventId, error: err.message ?? String(err) });
    }
    if (i < clases.length - 1) await sleep(sleepMs);
  }

  console.log(`\n[serial] resumen: ok=${ok} skipped=${skipped} failed=${failed}`);
  if (failed) {
    console.log(`Fallos:`);
    for (const f of failures) console.log(`  - ${f.titulo} (${f.eventId}): ${f.error}`);
  }

  if (founderId && (ok > 0 || skipped > 0) && failed === 0) {
    await markFoundersAsInvited([founderId], ADMIN_EMAIL);
    console.log(`OK marcado invitado_calendar_at en ${founderId}.`);
  } else if (founderId && failed > 0) {
    console.log(`NO marco invitado_calendar_at porque hubo ${failed} fallos. Re-corre el script.`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

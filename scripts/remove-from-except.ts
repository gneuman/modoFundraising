/**
 * Quita un email de TODOS los eventos del calendar EXCEPTO los indicados.
 * Silencioso (sendUpdates=none) para no notificar al removido.
 * Serial con sleep para evitar rate limit.
 *
 * Uso: npx tsx scripts/remove-from-except.ts <email> --keep=S1,S2 [--sleep=1500]
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";
import { google } from "googleapis";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
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
  const keepArg = args.find((a) => a.startsWith("--keep="));
  const sleepArg = args.find((a) => a.startsWith("--sleep="));
  const keep = keepArg ? keepArg.slice("--keep=".length).split(",").map((s) => s.trim().toUpperCase()) : [];
  const sleepMs = sleepArg ? parseInt(sleepArg.slice("--sleep=".length), 10) : 1500;

  if (!email || !keep.length) {
    console.error("Uso: npx tsx scripts/remove-from-except.ts <email> --keep=S1,S2 [--sleep=1500]");
    process.exit(1);
  }

  const clases = await base("Clases MF26")
    .select({ fields: ["titulo", "fecha", "calendar_event_id"], filterByFormula: `{calendar_event_id} != ""`, sort: [{ field: "fecha" }] })
    .all();

  // El prefijo del titulo es "S1 — ...", "S2 — ...", etc. Matcheo el primer token antes del " — ".
  const aQuitar: { titulo: string; eventId: string }[] = [];
  const aMantener: string[] = [];
  for (const c of clases) {
    const f = c.fields as any;
    const titulo = (f.titulo as string) ?? "";
    const prefix = titulo.split(/[\s—-]/)[0].toUpperCase(); // S1, S2, etc
    if (keep.includes(prefix)) aMantener.push(titulo);
    else aQuitar.push({ titulo, eventId: f.calendar_event_id });
  }

  console.log(`[except] email=${email}`);
  console.log(`[except] mantener (${aMantener.length}): ${aMantener.join(" | ")}`);
  console.log(`[except] quitar de (${aQuitar.length}) eventos, sendUpdates=none\n`);

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  let removed = 0, notPresent = 0, failed = 0;
  const failures: { titulo: string; eventId: string; error: string }[] = [];

  for (let i = 0; i < aQuitar.length; i++) {
    const { titulo, eventId } = aQuitar[i];
    process.stdout.write(`[${String(i + 1).padStart(2, "0")}/${aQuitar.length}] ${titulo} ... `);
    try {
      const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      const attendees = ev.data.attendees ?? [];
      if (!attendees.some((a) => a.email?.toLowerCase() === email)) {
        console.log("SKIP (no estaba)");
        notPresent++;
      } else {
        const newAttendees = attendees.filter((a) => a.email?.toLowerCase() !== email);
        await calendar.events.patch({
          calendarId: CALENDAR_ID,
          eventId,
          sendUpdates: "none",
          requestBody: { attendees: newAttendees },
        });
        console.log("OK removido");
        removed++;
      }
    } catch (err: any) {
      console.log(`FAIL ${err.message ?? err}`);
      failed++;
      failures.push({ titulo, eventId, error: err.message ?? String(err) });
    }
    if (i < aQuitar.length - 1) await sleep(sleepMs);
  }

  console.log(`\n[except] resumen: removed=${removed} notPresent=${notPresent} failed=${failed}`);
  if (failed) {
    console.log(`Fallos (re-corre el script para reintentar):`);
    for (const f of failures) console.log(`  - ${f.titulo} (${f.eventId}): ${f.error}`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

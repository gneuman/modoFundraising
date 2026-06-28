/**
 * Renombra los 26 eventos del calendar quitando el prefijo "Sx — " del summary.
 * - NO toca el titulo en Airtable (convencion del equipo: admin ordena por Sxx, founder ve sin prefijo).
 * - sendUpdates="none" para NO notificar "Event updated" a los attendees actuales.
 * - Serial con sleep para evitar rate limit.
 * - Idempotente: si el summary ya no tiene prefijo, lo salta.
 *
 * Uso: npx tsx scripts/rename-calendar-strip-prefix.ts [--sleep=1500] [--dry-run]
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
function stripPrefix(t: string): string {
  return t.replace(/^S\d+\s*[—–-]\s*/, "").trim();
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const sleepArg = args.find((a) => a.startsWith("--sleep="));
  const sleepMs = sleepArg ? parseInt(sleepArg.slice("--sleep=".length), 10) : 1500;

  const clases = await base("Clases MF26")
    .select({ fields: ["titulo", "fecha", "calendar_event_id"], filterByFormula: `{calendar_event_id} != ""`, sort: [{ field: "fecha" }] })
    .all();

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  console.log(`[rename] eventos=${clases.length} sleep=${sleepMs}ms dry=${dry} sendUpdates=none\n`);

  let renamed = 0, skipped = 0, failed = 0;
  const failures: { titulo: string; eventId: string; error: string }[] = [];

  for (let i = 0; i < clases.length; i++) {
    const c = clases[i];
    const f = c.fields as any;
    const eventId = f.calendar_event_id;
    const tituloAirtable = (f.titulo as string) ?? "";
    process.stdout.write(`[${String(i + 1).padStart(2, "0")}/${clases.length}] ${tituloAirtable} ... `);
    try {
      const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      const sumActual = ev.data.summary ?? "";
      const sumNuevo = stripPrefix(sumActual);
      if (sumActual === sumNuevo) {
        console.log(`SKIP (ya sin prefijo: "${sumActual}")`);
        skipped++;
      } else {
        if (dry) {
          console.log(`DRY-RUN: "${sumActual}" -> "${sumNuevo}"`);
          renamed++;
        } else {
          await calendar.events.patch({
            calendarId: CALENDAR_ID,
            eventId,
            sendUpdates: "none",
            requestBody: { summary: sumNuevo },
          });
          console.log(`OK -> "${sumNuevo}"`);
          renamed++;
        }
      }
    } catch (err: any) {
      console.log(`FAIL ${err.message ?? err}`);
      failed++;
      failures.push({ titulo: tituloAirtable, eventId, error: err.message ?? String(err) });
    }
    if (i < clases.length - 1) await sleep(sleepMs);
  }

  console.log(`\n[rename] resumen: renamed=${renamed} skipped=${skipped} failed=${failed}`);
  if (failed) {
    for (const f of failures) console.log(`  - ${f.titulo} (${f.eventId}): ${f.error}`);
    console.log(`Re-corre el script para reintentar los fallidos.`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

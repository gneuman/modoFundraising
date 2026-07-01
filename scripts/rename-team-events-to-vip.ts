/**
 * Renombra los eventos "Team" del calendar cambiando el prefijo "[Equipo] " por "[VIP] ".
 * - Fuente de eventos: Airtable, campo `calendar_event_id_team` de la tabla Clases MF26.
 * - sendUpdates="none" para NO notificar "Event updated" a los attendees actuales.
 * - Serial con sleep para evitar rate limit.
 * - Idempotente: si el summary ya arranca con "[VIP] " lo saltea.
 *
 * Uso:
 *   npx tsx scripts/rename-team-events-to-vip.ts [--sleep=1500] [--dry-run]
 *   npx tsx scripts/rename-team-events-to-vip.ts --apply     (alias explicito)
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

const OLD_PREFIX = "[Equipo] ";
const NEW_PREFIX = "[VIP] ";

function retitle(summary: string): string {
  if (summary.startsWith(NEW_PREFIX)) return summary;
  if (summary.startsWith(OLD_PREFIX)) return NEW_PREFIX + summary.slice(OLD_PREFIX.length);
  return NEW_PREFIX + summary;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run") || !args.includes("--apply");
  const sleepArg = args.find((a) => a.startsWith("--sleep="));
  const sleepMs = sleepArg ? parseInt(sleepArg.slice("--sleep=".length), 10) : 1500;

  // Usar table ID en vez de nombre (PATs restringidos por scope fallan con "Clases MF26")
  const CLASES_TABLE_ID = "tblHRJ35xMM3rQa85";
  const clases = await base(CLASES_TABLE_ID)
    .select({
      fields: ["titulo", "fecha", "calendar_event_id_team"],
      filterByFormula: `{calendar_event_id_team} != ""`,
      sort: [{ field: "fecha" }],
    })
    .all();

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  console.log(
    `[rename-team-vip] eventos=${clases.length} sleep=${sleepMs}ms mode=${dry ? "DRY-RUN" : "APPLY"} sendUpdates=none\n`,
  );

  let renamed = 0, skipped = 0, failed = 0;
  const failures: { titulo: string; eventId: string; error: string }[] = [];

  for (let i = 0; i < clases.length; i++) {
    const c = clases[i];
    const f = c.fields as any;
    const eventId = f.calendar_event_id_team as string;
    const tituloAirtable = (f.titulo as string) ?? "";
    process.stdout.write(`[${String(i + 1).padStart(2, "0")}/${clases.length}] ${tituloAirtable} ... `);
    try {
      const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      const sumActual = ev.data.summary ?? "";
      const sumNuevo = retitle(sumActual);
      if (sumActual === sumNuevo) {
        console.log(`SKIP (ya es "${sumActual}")`);
        skipped++;
      } else if (dry) {
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
    } catch (err: any) {
      console.log(`FAIL ${err.message ?? err}`);
      failed++;
      failures.push({ titulo: tituloAirtable, eventId, error: err.message ?? String(err) });
    }
    if (i < clases.length - 1) await sleep(sleepMs);
  }

  console.log(`\n[rename-team-vip] resumen: renamed=${renamed} skipped=${skipped} failed=${failed}`);
  if (failed) {
    for (const f of failures) console.log(`  - ${f.titulo} (${f.eventId}): ${f.error}`);
    console.log(`Re-corre el script para reintentar los fallidos.`);
  }
  if (dry) console.log(`\nDry-run OK. Para aplicar: npx tsx scripts/rename-team-events-to-vip.ts --apply`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

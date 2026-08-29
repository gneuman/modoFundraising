/**
 * Mueve el START de cada evento Team futuro 5 minutos antes.
 * El END queda igual (evento dura 5 min más).
 *
 * Alcance: mismos 25 eventos del backfill (M1 + S3..S26, excluye S1/S2 pasados).
 * Idempotente por marca: si el start ya coincide con fecha-5min, salta.
 *
 * sendUpdates="all" para que los attendees (da@, maca@, lola@impacta.vc) vean
 * el cambio de horario en su Calendar.
 *
 * Uso:
 *   npx tsx scripts/team-events-start-5min-antes.ts              (dry-run)
 *   npx tsx scripts/team-events-start-5min-antes.ts --apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";
import { google } from "googleapis";
import { TZ } from "@/lib/timezone";

const CLASES_TABLE_ID = "tblHRJ35xMM3rQa85";
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const OFFSET_MIN = 5;

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

function getOAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function prefix(titulo: string): string {
  return titulo.split(/[\s—-]/)[0].toUpperCase();
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const sleepMs = 1200;

  const now = new Date();
  const records = await base(CLASES_TABLE_ID)
    .select({
      fields: ["titulo", "fecha", "calendar_event_id_team"],
      sort: [{ field: "fecha" }],
    })
    .all();

  const rows = records
    .map((r) => {
      const f = r.fields as any;
      return {
        titulo: (f.titulo as string) ?? "",
        fecha: f.fecha as string | undefined,
        teamId: f.calendar_event_id_team as string | undefined,
      };
    })
    .filter((r) => r.fecha && r.teamId && new Date(r.fecha) > now)
    .filter((r) => {
      const p = prefix(r.titulo);
      return p !== "S1" && p !== "S2";
    });

  console.log(`\n[start-5min] mode=${apply ? "APPLY" : "DRY-RUN"} eventos=${rows.length} offset=-${OFFSET_MIN}min\n`);

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  let updated = 0, skipped = 0, failed = 0;
  const failures: { titulo: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    const label = `[${String(i + 1).padStart(2, "0")}/${rows.length}] ${c.titulo}`;

    try {
      const cur = await calendar.events.get({
        calendarId: CALENDAR_ID,
        eventId: c.teamId!,
      });
      const ev = cur.data;
      const curStart = ev.start?.dateTime;
      const curEnd = ev.end?.dateTime;
      if (!curStart || !curEnd) throw new Error("evento sin dateTime (all-day?)");

      const newStart = new Date(new Date(curStart).getTime() - OFFSET_MIN * 60_000);
      const newStartIso = newStart.toISOString();

      // Idempotencia: si ya arranca 5 min antes que la fecha canónica de Airtable
      // (curStart == airtableFecha - 5min), skip.
      const airtableFecha = new Date(c.fecha!).toISOString();
      const curStartIso = new Date(curStart).toISOString();
      const expectedIfShifted = new Date(new Date(c.fecha!).getTime() - OFFSET_MIN * 60_000).toISOString();

      if (curStartIso === expectedIfShifted) {
        console.log(`${label} SKIP (ya arranca 5min antes)`);
        skipped++;
      } else {
        if (apply) {
          await calendar.events.patch({
            calendarId: CALENDAR_ID,
            eventId: c.teamId!,
            sendUpdates: "all",
            requestBody: {
              start: { dateTime: newStartIso, timeZone: TZ },
              end: { dateTime: new Date(curEnd).toISOString(), timeZone: TZ },
            },
          });
        }
        console.log(`${label} ${apply ? "OK" : "DRY-RUN"}: ${curStartIso} → ${newStartIso}  (fin ${curEnd})`);
        updated++;
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.log(`${label} FAIL ${msg}`);
      failures.push({ titulo: c.titulo, error: msg });
      failed++;
    }

    if (i < rows.length - 1) await sleep(sleepMs);
  }

  console.log(`\n[start-5min] resumen: updated=${updated} skipped=${skipped} failed=${failed}`);
  if (failures.length) for (const f of failures) console.log(`  - ${f.titulo}: ${f.error}`);
  if (!apply) console.log(`\nDry-run OK. Para aplicar: --apply`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

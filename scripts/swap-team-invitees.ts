/**
 * Reemplaza los invitados del team en TODOS los eventos Team futuros del programa MF26.
 *
 * - REMOVE (sendUpdates="none"): admin@, hola@, nmacchiavello@impacta.vc
 * - ADD (sendUpdates="all"):     da@,    maca@, lola@impacta.vc
 *
 * Excluye S1 y S2 (ya pasaron). Solo toca eventos futuros con
 * `calendar_event_id_team` en Airtable.
 *
 * Idempotente: si un email ya no está / ya está, no hace nada.
 *
 * Uso:
 *   npx tsx scripts/swap-team-invitees.ts              (dry-run)
 *   npx tsx scripts/swap-team-invitees.ts --apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";
import { google } from "googleapis";

const CLASES_TABLE_ID = "tblHRJ35xMM3rQa85";
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

const REMOVE = ["admin@impacta.vc", "hola@impacta.vc", "nmacchiavello@impacta.vc"];
const ADD = ["da@impacta.vc", "maca@impacta.vc", "lola@impacta.vc"];

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

  console.log(`\n[swap-team] mode=${apply ? "APPLY" : "DRY-RUN"} eventos=${rows.length}`);
  console.log(`[swap-team] REMOVE (sendUpdates=none): ${REMOVE.join(", ")}`);
  console.log(`[swap-team] ADD    (sendUpdates=all):  ${ADD.join(", ")}\n`);

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  let removed = 0, added = 0, failed = 0;
  const failures: { titulo: string; step: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    const label = `[${String(i + 1).padStart(2, "0")}/${rows.length}] ${c.titulo}`;

    try {
      // Paso 1: REMOVE viejos (sin notificar)
      const cur = await calendar.events.get({
        calendarId: CALENDAR_ID,
        eventId: c.teamId!,
      });
      const existing = cur.data.attendees ?? [];
      const removeSet = new Set(REMOVE.map((e) => e.toLowerCase()));
      const kept = existing.filter(
        (a) => !removeSet.has((a.email ?? "").toLowerCase()),
      );
      const nRemoved = existing.length - kept.length;

      if (nRemoved > 0) {
        if (apply) {
          await calendar.events.patch({
            calendarId: CALENDAR_ID,
            eventId: c.teamId!,
            sendUpdates: "none",
            requestBody: {
              attendees: kept,
              guestsCanSeeOtherGuests: false,
              guestsCanInviteOthers: false,
            },
          });
        }
        removed += nRemoved;
      }

      // Paso 2: ADD nuevos (notificando)
      const currentSet = new Set(kept.map((a) => (a.email ?? "").toLowerCase()));
      const nuevos = ADD.filter((e) => !currentSet.has(e.toLowerCase()));

      if (nuevos.length > 0) {
        if (apply) {
          await calendar.events.patch({
            calendarId: CALENDAR_ID,
            eventId: c.teamId!,
            sendUpdates: "all",
            requestBody: {
              attendees: [...kept, ...nuevos.map((email) => ({ email }))],
              guestsCanSeeOtherGuests: false,
              guestsCanInviteOthers: false,
            },
          });
        }
        added += nuevos.length;
      }

      console.log(`${label} → -${nRemoved} +${nuevos.length}`);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.log(`${label} FAIL ${msg}`);
      failures.push({ titulo: c.titulo, step: "swap", error: msg });
      failed++;
    }

    if (i < rows.length - 1) await sleep(sleepMs);
  }

  console.log(`\n[swap-team] resumen: removed=${removed} added=${added} failed=${failed}`);
  if (failures.length) {
    for (const f of failures) console.log(`  - ${f.titulo}: ${f.error}`);
  }
  if (!apply) console.log(`\nDry-run OK. Para aplicar: --apply`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

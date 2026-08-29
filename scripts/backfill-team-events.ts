/**
 * Backfill de eventos "Team" en Google Calendar para clases MF26.
 *
 * Para cada clase futura (excluyendo prefix S1 y S2 que ya pasaron):
 *   1. Si NO tiene calendar_event_id_team → crea evento "[VIP] <titulo>" con
 *      url_live_team en la descripción, invita a los 3 correos del team con
 *      sendUpdates="all", y persiste calendar_event_id_team en Airtable.
 *   2. Si YA tiene calendar_event_id_team → solo agrega los 3 correos como
 *      attendees si faltan (idempotente).
 *
 * Reglas del proyecto respetadas:
 *   - Excluye S1 y S2 explícitamente (ya pasaron).
 *   - No toca `url_live` ni `calendar_event_id` (evento Founders): son propiedad
 *     del usuario y del webhook clase-upsert.
 *   - Serial con sleep para evitar rate limit de Google Calendar API.
 *   - sendUpdates="all" para que los 3 correos reciban invitación real.
 *
 * Uso:
 *   npx tsx scripts/backfill-team-events.ts              (dry-run)
 *   npx tsx scripts/backfill-team-events.ts --apply
 *   npx tsx scripts/backfill-team-events.ts --apply --sleep=1500
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";
import { google } from "googleapis";
import { TZ } from "@/lib/timezone";
import { buildDescription } from "@/lib/calendar";

const CLASES_TABLE_ID = "tblHRJ35xMM3rQa85";
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const TEAM_INVITEES = ["admin@impacta.vc", "hola@impacta.vc", "nmacchiavello@impacta.vc"];
const TEAM_EVENT_TITLE_PREFIX = "[VIP] ";
const DEFAULT_DURATION_MIN = 90;

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

interface ClaseRow {
  recordId: string;
  titulo: string;
  fecha: string;
  descripcion?: string;
  duracionMinutos?: number;
  urlLiveTeam?: string;
  teamEventId?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const sleepArg = args.find((a) => a.startsWith("--sleep="));
  const sleepMs = sleepArg ? parseInt(sleepArg.slice("--sleep=".length), 10) : 1500;

  const now = new Date();
  const records = await base(CLASES_TABLE_ID)
    .select({
      fields: [
        "titulo",
        "fecha",
        "descripcion",
        "duracion_minutos",
        "url_live_team",
        "calendar_event_id_team",
      ],
      sort: [{ field: "fecha" }],
    })
    .all();

  const clases: ClaseRow[] = records
    .map((r) => {
      const f = r.fields as any;
      return {
        recordId: r.id,
        titulo: (f.titulo as string) ?? "",
        fecha: f.fecha as string,
        descripcion: f.descripcion as string | undefined,
        duracionMinutos: f.duracion_minutos as number | undefined,
        urlLiveTeam: f.url_live_team as string | undefined,
        teamEventId: f.calendar_event_id_team as string | undefined,
      };
    })
    .filter((r) => r.fecha && new Date(r.fecha) > now)
    .filter((r) => {
      const p = prefix(r.titulo);
      return p !== "S1" && p !== "S2";
    });

  const toCreate = clases.filter((c) => !c.teamEventId);
  const toInvite = clases.filter((c) => c.teamEventId);

  console.log(
    `\n[backfill-team] mode=${apply ? "APPLY" : "DRY-RUN"} sleep=${sleepMs}ms`,
  );
  console.log(`[backfill-team] a CREAR:  ${toCreate.length}`);
  console.log(`[backfill-team] a INVITAR: ${toInvite.length}`);
  console.log(`[backfill-team] invitees: ${TEAM_INVITEES.join(", ")}\n`);

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  let created = 0,
    createFailed = 0,
    invited = 0,
    inviteFailed = 0;
  const failures: { titulo: string; step: string; error: string }[] = [];

  // ─── FASE 1: CREATE eventos Team faltantes ────────────────────────────────
  console.log(`── FASE 1: CREATE ─────────────────────────────`);
  for (let i = 0; i < toCreate.length; i++) {
    const c = toCreate[i];
    const label = `[${String(i + 1).padStart(2, "0")}/${toCreate.length}] ${c.titulo}`;
    process.stdout.write(`${label} ... `);

    const start = new Date(c.fecha);
    const end = new Date(
      start.getTime() + (c.duracionMinutos ?? DEFAULT_DURATION_MIN) * 60_000,
    );
    const summary = `${TEAM_EVENT_TITLE_PREFIX}${c.titulo}`;
    const description = buildDescription(c.urlLiveTeam, c.descripcion);

    if (!apply) {
      console.log(
        `DRY-RUN: crear "${summary}" @ ${start.toISOString()} inv=${TEAM_INVITEES.length}`,
      );
      created++;
      continue;
    }

    try {
      const res = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        sendUpdates: "all",
        requestBody: {
          summary,
          description,
          start: { dateTime: start.toISOString(), timeZone: TZ },
          end: { dateTime: end.toISOString(), timeZone: TZ },
          attendees: TEAM_INVITEES.map((email) => ({ email })),
          guestsCanSeeOtherGuests: false,
          guestsCanInviteOthers: false,
        },
      });
      const newEventId = res.data.id;
      if (!newEventId) throw new Error("Calendar no devolvió eventId");

      await base(CLASES_TABLE_ID).update(c.recordId, {
        calendar_event_id_team: newEventId,
      } as never);

      console.log(`OK → ${newEventId}`);
      created++;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.log(`FAIL ${msg}`);
      failures.push({ titulo: c.titulo, step: "create", error: msg });
      createFailed++;
    }

    if (i < toCreate.length - 1) await sleep(sleepMs);
  }

  // ─── FASE 2: INVITE en eventos Team existentes ───────────────────────────
  console.log(`\n── FASE 2: INVITE (existentes) ─────────────────`);
  for (let i = 0; i < toInvite.length; i++) {
    const c = toInvite[i];
    const label = `[${String(i + 1).padStart(2, "0")}/${toInvite.length}] ${c.titulo}`;
    process.stdout.write(`${label} ... `);

    if (!apply) {
      console.log(`DRY-RUN: invitar a ${c.teamEventId}`);
      invited++;
      continue;
    }

    try {
      const cur = await calendar.events.get({
        calendarId: CALENDAR_ID,
        eventId: c.teamEventId!,
      });
      const existing = cur.data.attendees ?? [];
      const existingEmails = new Set(
        existing.map((a) => (a.email ?? "").toLowerCase()),
      );
      const nuevos = TEAM_INVITEES.filter(
        (e) => !existingEmails.has(e.toLowerCase()),
      );

      if (!nuevos.length) {
        console.log(`SKIP (ya invitados)`);
        invited++;
      } else {
        await calendar.events.patch({
          calendarId: CALENDAR_ID,
          eventId: c.teamEventId!,
          sendUpdates: "all",
          requestBody: {
            attendees: [...existing, ...nuevos.map((email) => ({ email }))],
            guestsCanSeeOtherGuests: false,
            guestsCanInviteOthers: false,
          },
        });
        console.log(`OK +${nuevos.length} (${nuevos.join(", ")})`);
        invited++;
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.log(`FAIL ${msg}`);
      failures.push({ titulo: c.titulo, step: "invite", error: msg });
      inviteFailed++;
    }

    if (i < toInvite.length - 1) await sleep(sleepMs);
  }

  // ─── Resumen ─────────────────────────────────────────────────────────────
  console.log(`\n[backfill-team] resumen:`);
  console.log(
    `  CREATE: ${created} ok / ${createFailed} fail (de ${toCreate.length})`,
  );
  console.log(
    `  INVITE: ${invited} ok / ${inviteFailed} fail (de ${toInvite.length})`,
  );
  if (failures.length) {
    console.log(`\nFallidos:`);
    for (const f of failures)
      console.log(`  - [${f.step}] ${f.titulo}: ${f.error}`);
    console.log(`Re-corre el script para reintentar los fallidos.`);
  }
  if (!apply) {
    console.log(
      `\nDry-run OK. Para aplicar: npx tsx scripts/backfill-team-events.ts --apply`,
    );
  }
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

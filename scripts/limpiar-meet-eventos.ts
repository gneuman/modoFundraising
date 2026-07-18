/**
 * OP-2156 — Limpia el residuo de Google Meet del programa (usa Streamyard, no Meet).
 *
 * Diagnóstico real (17-jul-2026): los EVENTOS de Google Calendar YA no tienen Meet
 * (conferenceData=none en los 26). Lo que quedó sucio es el campo `meet_link` en
 * Airtable (texto residual de una corrida vieja de recrear-eventos-primary.ts).
 * Ese residuo importaba porque el cron session-start lo priorizaba sobre url_live
 * y mandaba a los founders un link de Meet muerto (ya corregido en el cron).
 *
 * Este script recorre las clases con calendar_event_id y:
 *  - Si el evento AÚN tuviera conferenceData/hangoutLink (por si acaso), lo quita
 *    con events.patch (conferenceData: null). NO borra el evento, NO toca attendees
 *    ni la descripción (el link de Streamyard queda intacto).
 *  - Limpia el campo residual `meet_link` en Airtable.
 *
 * Uso:
 *   npx tsx scripts/limpiar-meet-eventos.ts            # dry-run (solo reporta)
 *   npx tsx scripts/limpiar-meet-eventos.ts --apply    # limpia
 */
import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const APPLY = process.argv.includes("--apply");
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

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

async function main() {
  console.log("─".repeat(60));
  console.log(`LIMPIAR MEET · ${APPLY ? "MODO APPLY" : "DRY-RUN"}`);
  console.log(`Calendar: ${CALENDAR_ID}`);
  console.log("─".repeat(60));

  const records = await base("tblHRJ35xMM3rQa85")
    .select({
      fields: ["titulo", "calendar_event_id", "meet_link"],
      filterByFormula: `{calendar_event_id} != ""`,
      sort: [{ field: "fecha", direction: "asc" }],
    })
    .all();

  console.log(`\nClases con calendar_event_id: ${records.length}\n`);

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  let conMeet = 0;
  let limpiadas = 0;
  let fallidas = 0;

  for (const r of records) {
    const f = r.fields as Record<string, unknown>;
    const titulo = (f.titulo as string) ?? "(sin título)";
    const eventId = f.calendar_event_id as string;
    const meetLinkAirtable = (f.meet_link as string) ?? "";

    let ev;
    try {
      const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      ev = res.data;
    } catch (err) {
      console.log(`  ⚠️  ${titulo} [${eventId}] → no se pudo leer: ${err instanceof Error ? err.message : err}`);
      fallidas++;
      continue;
    }

    const tieneMeet = !!ev.hangoutLink || !!ev.conferenceData;
    if (!tieneMeet && !meetLinkAirtable) {
      console.log(`  ✓ ${titulo} → sin Meet (OK)`);
      continue;
    }

    conMeet++;
    console.log(`  🔴 ${titulo} [${eventId}] → tiene Meet (hangoutLink=${ev.hangoutLink ?? "—"})`);

    if (!APPLY) {
      console.log(`     [dry] quitaría conferenceData y limpiaría meet_link en Airtable`);
      continue;
    }

    try {
      await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId,
        conferenceDataVersion: 1,
        sendUpdates: "none",
        // conferenceData: null borra el Meet. El tipo TS de googleapis no admite
        // null aquí aunque la Calendar API sí lo acepta para vaciar el campo.
        requestBody: { conferenceData: null } as never,
      });
      if (meetLinkAirtable) {
        await base("tblHRJ35xMM3rQa85").update(r.id, { meet_link: "" } as never);
      }
      console.log(`     ✓ Meet quitado`);
      limpiadas++;
    } catch (err) {
      console.log(`     ✗ FALLÓ: ${err instanceof Error ? err.message : err}`);
      fallidas++;
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`RESUMEN: con Meet=${conMeet}, limpiadas=${limpiadas}, fallidas=${fallidas}`);
  console.log("─".repeat(60));
  if (!APPLY && conMeet > 0) {
    console.log("\n⚠️  Dry-run. Para quitar el Meet de verdad:");
    console.log("    npx tsx scripts/limpiar-meet-eventos.ts --apply");
  }
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});

/**
 * Cleanup: borra los 26 eventos viejos del calendar group y limpia los campos
 * relacionados en Airtable, dejando todo listo para que se creen eventos nuevos
 * en el calendar primario de admin@impacta.vc.
 *
 * Borra: calendar_event_id, meet_link, calendar_event_id_team,
 *        meet_link_team de cada clase.
 * NO toca: url_live ni url_live_team (los administra el usuario a mano).
 *
 * También elimina cada evento del calendar group (sendUpdates: "all" para que
 * los 2 attendees actuales — neumang@gmail.com y da@impacta.vc — reciban el
 * "Event cancelled" y no queden con invites huérfanos).
 *
 * Uso:
 *   npx tsx scripts/cleanup-eventos-viejos.ts            # dry-run
 *   npx tsx scripts/cleanup-eventos-viejos.ts --apply    # ejecuta
 */

import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

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
  console.log(`CLEANUP eventos viejos · ${APPLY ? "MODO APPLY" : "DRY-RUN"}`);
  console.log(`Calendar: ${CALENDAR_ID}`);
  console.log("─".repeat(60));

  const records = await base("Clases MF26")
    .select({
      fields: ["titulo", "fecha", "calendar_event_id", "calendar_event_id_team"],
      filterByFormula: `OR({calendar_event_id} != "", {calendar_event_id_team} != "")`,
      sort: [{ field: "fecha", direction: "asc" }],
    })
    .all();

  console.log(`\nClases con eventos a limpiar: ${records.length}\n`);

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  let deletedFounders = 0;
  let deletedTeam = 0;
  let patchedAirtable = 0;
  let errors = 0;

  for (const [i, r] of records.entries()) {
    const f = r.fields as Record<string, unknown>;
    const titulo = (f.titulo as string) ?? "(sin título)";
    const eventId = (f.calendar_event_id as string) ?? "";
    const eventIdTeam = (f.calendar_event_id_team as string) ?? "";
    const prefix = `[${String(i + 1).padStart(2, "0")}/${records.length}] ${titulo}`;

    console.log(prefix);

    // Borrar founders event
    if (eventId) {
      if (APPLY) {
        try {
          await calendar.events.delete({
            calendarId: CALENDAR_ID,
            eventId,
            sendUpdates: "all",
          });
          console.log(`   ✓ founders event borrado (${eventId})`);
          deletedFounders++;
        } catch (err) {
          console.log(`   ✗ founders event FALLÓ: ${err instanceof Error ? err.message : err}`);
          errors++;
        }
      } else {
        console.log(`   [dry] borraría founders event ${eventId}`);
      }
    }

    // Borrar team event (si existe)
    if (eventIdTeam) {
      if (APPLY) {
        try {
          await calendar.events.delete({
            calendarId: CALENDAR_ID,
            eventId: eventIdTeam,
            sendUpdates: "all",
          });
          console.log(`   ✓ team event borrado (${eventIdTeam})`);
          deletedTeam++;
        } catch (err) {
          console.log(`   ✗ team event FALLÓ: ${err instanceof Error ? err.message : err}`);
          errors++;
        }
      } else {
        console.log(`   [dry] borraría team event ${eventIdTeam}`);
      }
    }

    // Limpiar campos en Airtable.
    // OJO: NO tocamos url_live ni url_live_team. Esos campos los administra el
    // usuario a mano (Zoom, Streamyard, link propio). Solo limpiamos lo que
    // este script realmente posee: calendar_event_id y meet_link.
    if (APPLY) {
      try {
        await base("Clases MF26").update(r.id, {
          calendar_event_id: "",
          calendar_event_id_team: "",
          meet_link: "",
          meet_link_team: "",
        } as never);
        console.log(`   ✓ Airtable limpiado (calendar_event_id + meet_link)`);
        patchedAirtable++;
      } catch (err) {
        console.log(`   ✗ Airtable FALLÓ: ${err instanceof Error ? err.message : err}`);
        errors++;
      }
    } else {
      console.log(`   [dry] limpiaría calendar_event_id + meet_link (+ _team) — NO toca url_live`);
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(
    `RESUMEN: founders borrados=${deletedFounders}, team borrados=${deletedTeam}, ` +
    `Airtable limpiado=${patchedAirtable}, errors=${errors}`,
  );
  console.log("─".repeat(60));

  if (!APPLY) {
    console.log("\n⚠️  Dry-run. Para ejecutar de verdad:");
    console.log("    npx tsx scripts/cleanup-eventos-viejos.ts --apply");
  }
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});

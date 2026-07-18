/**
 * Recrea los 26 eventos de Modo Fundraising 2026 en el calendar primary
 * (admin@impacta.vc) y guarda los nuevos calendar_event_id en Airtable.
 *
 * ⚠️ IMPORTANTE (OP-2156): el programa NO usa Google Meet — usa Streamyard.
 * El link en vivo va en la DESCRIPCIÓN del evento ("🔴 EN VIVO:"), no como
 * videollamada de Meet. Este script ANTES pedía Meet (conferenceDataVersion:1 +
 * hangoutsMeet) y ensuciaba los eventos con Meet erróneo. Eso se removió: ahora
 * crea eventos SIN Meet, alineado con src/lib/calendar.ts (createCalendarEvent).
 *
 * Preferí usar el flujo de producción (webhook clase-upsert / rutas admin de
 * calendar) antes que este script. Existe como respaldo de emergencia.
 *
 * Para limpiar Meet de eventos ya creados: scripts/limpiar-meet-eventos.ts.
 *
 * Idempotente: si una clase ya tiene calendar_event_id, no la toca.
 * Para reemplazar, primero correr scripts/cleanup-eventos-viejos.ts.
 *
 * Uso:
 *   npx tsx scripts/recrear-eventos-primary.ts            # dry-run
 *   npx tsx scripts/recrear-eventos-primary.ts --apply    # ejecuta
 */

import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const APPLY = process.argv.includes("--apply");
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const TZ = "America/Santiago";
const DURACION_MIN = 90;

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

interface Clase {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  calendar_event_id?: string;
}

async function main() {
  console.log("─".repeat(60));
  console.log(`RECREAR EVENTOS · ${APPLY ? "MODO APPLY" : "DRY-RUN"}`);
  console.log(`Calendar: ${CALENDAR_ID}`);
  console.log(`Timezone: ${TZ}`);
  console.log(`Duración: ${DURACION_MIN} min`);
  console.log("─".repeat(60));

  const records = await base("Clases MF26")
    .select({
      fields: ["titulo", "descripcion", "fecha", "calendar_event_id"],
      filterByFormula: `{fecha} != ""`,
      sort: [{ field: "fecha", direction: "asc" }],
    })
    .all();

  const clases: Clase[] = records.map((r) => {
    const f = r.fields as Record<string, unknown>;
    return {
      id: r.id,
      titulo: (f.titulo as string) ?? "(sin título)",
      descripcion: f.descripcion as string | undefined,
      fecha: f.fecha as string,
      calendar_event_id: f.calendar_event_id as string | undefined,
    };
  });

  const aCrear = clases.filter((c) => !c.calendar_event_id);
  const yaCreadas = clases.filter((c) => c.calendar_event_id);

  console.log(`\nClases con fecha: ${clases.length}`);
  console.log(`  Ya tienen calendar_event_id (saltadas): ${yaCreadas.length}`);
  console.log(`  A crear: ${aCrear.length}\n`);

  if (yaCreadas.length) {
    console.log("Saltadas:");
    for (const c of yaCreadas) console.log(`  - ${c.titulo} (${c.calendar_event_id})`);
    console.log();
  }

  if (!aCrear.length) {
    console.log("No hay nada que crear. Termino.");
    return;
  }

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  let creadas = 0;
  let fallidas = 0;

  for (const [i, clase] of aCrear.entries()) {
    const prefix = `[${String(i + 1).padStart(2, "0")}/${aCrear.length}] ${clase.fecha.slice(0, 10)} ${clase.titulo}`;

    if (!APPLY) {
      console.log(`${prefix} → [dry] crearía evento ${DURACION_MIN}min`);
      continue;
    }

    try {
      const start = new Date(clase.fecha);
      const end = new Date(start.getTime() + DURACION_MIN * 60_000);

      // SIN Meet (OP-2156): no pasamos conferenceDataVersion ni conferenceData.
      // El programa usa Streamyard; el link va en la descripción, no como Meet.
      const res = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        sendUpdates: "none",
        requestBody: {
          summary: clase.titulo,
          description: clase.descripcion ?? "",
          start: { dateTime: start.toISOString(), timeZone: TZ },
          end: { dateTime: end.toISOString(), timeZone: TZ },
          guestsCanSeeOtherGuests: false,
          guestsCanInviteOthers: false,
        },
      });

      const eventId = res.data.id!;

      // NO tocamos url_live ni meet_link. url_live lo administra el usuario a mano
      // (Streamyard). meet_link ya no se genera.
      await base("Clases MF26").update(clase.id, {
        calendar_event_id: eventId,
      } as never);

      console.log(`${prefix} → ✓ ${eventId}`);
      creadas++;
    } catch (err) {
      console.log(`${prefix} → ✗ FALLÓ: ${err instanceof Error ? err.message : err}`);
      fallidas++;
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`RESUMEN: creadas=${creadas}, fallidas=${fallidas}, saltadas=${yaCreadas.length}`);
  console.log("─".repeat(60));

  if (!APPLY) {
    console.log("\n⚠️  Dry-run. Para crear de verdad:");
    console.log("    npx tsx scripts/recrear-eventos-primary.ts --apply");
  }
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});

/**
 * Test rápido: crea un evento de prueba en primary, te invita,
 * verifica que el organizer es admin@impacta.vc, y luego lo borra.
 *
 * Uso:
 *   npx tsx scripts/test-evento-primary.ts <email>
 *   npx tsx scripts/test-evento-primary.ts <email> --keep   # no lo borra
 */

import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const email = (process.argv[2] ?? "").trim().toLowerCase();
const KEEP = process.argv.includes("--keep");

if (!email || !/.+@.+\..+/.test(email)) {
  console.error("Uso: npx tsx scripts/test-evento-primary.ts <email> [--keep]");
  process.exit(1);
}

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

function getOAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

async function main() {
  console.log(`Calendar: ${CALENDAR_ID}`);
  console.log(`Test attendee: ${email}\n`);

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  // 1. Crear evento dentro de 30min, 30 min de duración (no spammea visualmente)
  const start = new Date(Date.now() + 30 * 60_000);
  const end = new Date(start.getTime() + 30 * 60_000);

  console.log("1. Creando evento de prueba...");
  const created = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: "[TEST] Modo Fundraising — borrar después",
      description: "Evento de prueba para verificar que el remitente aparece como admin@impacta.vc",
      start: { dateTime: start.toISOString(), timeZone: "America/Mexico_City" },
      end: { dateTime: end.toISOString(), timeZone: "America/Mexico_City" },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId: `mf26-test-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      guestsCanSeeOtherGuests: false,
      guestsCanInviteOthers: false,
    },
  });

  const eventId = created.data.id!;
  console.log(`   ✓ Creado: ${eventId}`);
  console.log(`   Organizer:`, created.data.organizer);
  console.log(`   Creator:`, created.data.creator);
  console.log(`   HTML link: ${created.data.htmlLink}\n`);

  console.log(`📬 Revisa el inbox de ${email}.`);
  console.log(`   Si el organizer = admin@impacta.vc, NO debería haber warning de "remitente desconocido".\n`);

  if (!KEEP) {
    console.log("2. Borrando evento en 30 seg... (Ctrl+C para conservarlo, o --keep)");
    await new Promise((r) => setTimeout(r, 30_000));
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId,
      sendUpdates: "all",
    });
    console.log(`   ✓ Borrado.`);
  } else {
    console.log(`Evento conservado (--keep). Borralo manualmente cuando termines:`);
    console.log(`   ${created.data.htmlLink}`);
  }
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});

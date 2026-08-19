/**
 * Prueba si la cuenta del sistema puede AGREGAR un attendee al evento Dataroom
 * (creado por admin@impacta.vc). Agrega 1 solo email de prueba, sendUpdates=none.
 * Si Google devuelve 403, el sistema no es organizer y no podrá invitar a los 93.
 * Uso: npx tsx scripts/test-dataroom-patch.ts
 */
import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const EVENT_ID = "8afhshkde90cmjivb1d7mcnct4";
const TEST_EMAIL = "neumang+dataroomtest@gmail.com";

function getAuth() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

async function main() {
  console.log("GOOGLE_CALENDAR_ID (sistema):", CALENDAR_ID);
  const calendar = google.calendar({ version: "v3", auth: getAuth() });

  // ¿Qué email es la cuenta del sistema?
  const cals = await calendar.calendarList.list();
  const primaryCal = cals.data.items?.find((c) => c.primary);
  console.log("Cuenta del sistema (primary):", primaryCal?.id);

  const before = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: EVENT_ID });
  const existing = (before.data.attendees ?? []).map((a) => ({ email: a.email }));
  console.log(`\nattendees antes: ${existing.length}`);

  try {
    const res = await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId: EVENT_ID,
      sendUpdates: "none", // NO notifica a nadie en la prueba
      requestBody: { attendees: [...existing, { email: TEST_EMAIL }] },
    });
    console.log(`\nPATCH OK. attendees ahora: ${(res.data.attendees ?? []).length}`);
    console.log("→ El sistema SÍ puede modificar attendees de este evento.");

    // Revertir: quitar el test email
    await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId: EVENT_ID,
      sendUpdates: "none",
      requestBody: { attendees: existing },
    });
    console.log("Revertido (quitado el test email).");
  } catch (e: any) {
    console.log(`\nPATCH FALLÓ: ${e.code ?? ""} ${e.message}`);
    console.log("→ El sistema NO puede modificar este evento (probable: no es el organizer).");
  }
}
main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

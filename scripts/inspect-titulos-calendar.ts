/**
 * Lista los titulos actuales de los 26 eventos del calendar y muestra
 * como quedarian sin el prefijo "Sxx — " o "Sxx -".
 */
import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

function getOAuth() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

// Quita "S1 — ", "S26 - ", "S7 —" del inicio.
function stripPrefix(titulo: string): string {
  return titulo.replace(/^S\d+\s*[—-]\s*/, "").trim();
}

async function main() {
  const clases = await base("Clases MF26")
    .select({ fields: ["titulo", "fecha", "calendar_event_id"], filterByFormula: `{calendar_event_id} != ""`, sort: [{ field: "fecha" }] })
    .all();

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  console.log(`Comparando ${clases.length} eventos: titulo Airtable vs Calendar vs propuesta\n`);

  for (const c of clases) {
    const f = c.fields as any;
    const tituloAirtable = (f.titulo as string) ?? "";
    const eventId = f.calendar_event_id;
    try {
      const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      const sumActual = ev.data.summary ?? "(vacio)";
      const sumNuevo = stripPrefix(sumActual);
      const cambia = sumActual !== sumNuevo;
      console.log(`${cambia ? "✏️ " : "   "} ${sumActual}`);
      if (cambia) console.log(`      -> ${sumNuevo}`);
    } catch (err: any) {
      console.log(`   FAIL ${tituloAirtable}: ${err.message ?? err}`);
    }
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

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

async function main() {
  const records = await base("Clases MF26")
    .select({ fields: ["titulo", "fecha", "calendar_event_id"], sort: [{ field: "fecha" }] })
    .all();

  console.log(`Total clases: ${records.length}\n`);

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  const ahora = new Date();
  console.log(`Ahora (UTC): ${ahora.toISOString()}`);
  console.log(`Ahora (CDMX): ${ahora.toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}\n`);

  // Primeras 4 clases ordenadas por fecha
  for (let i = 0; i < Math.min(4, records.length); i++) {
    const r = records[i];
    const f = r.fields as any;
    const eventId = f.calendar_event_id;
    console.log(`--- Clase #${i + 1} | "${f.titulo}" ---`);
    console.log(`  Airtable: fecha=${f.fecha}`);
    if (!eventId) {
      console.log(`  SIN calendar_event_id`);
      continue;
    }
    try {
      const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      const start = ev.data.start?.dateTime ?? ev.data.start?.date;
      const end = ev.data.end?.dateTime ?? ev.data.end?.date;
      const startDate = start ? new Date(start) : null;
      const yaArrancO = startDate ? startDate < ahora : false;
      const yaTermino = end ? new Date(end) < ahora : false;
      console.log(`  Calendar: ${ev.data.summary}`);
      console.log(`  Start:  ${start} (${startDate?.toLocaleString("es-MX", { timeZone: "America/Mexico_City" })})`);
      console.log(`  End:    ${end}`);
      console.log(`  Status: ${ev.data.status}`);
      console.log(`  Attendees: ${ev.data.attendees?.length ?? 0}`);
      console.log(`  Ya arranco? ${yaArrancO ? "SI" : "NO"}  Ya termino? ${yaTermino ? "SI" : "NO"}`);
    } catch (err: any) {
      console.log(`  ERROR leyendo evento: ${err.message ?? err}`);
    }
    console.log();
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

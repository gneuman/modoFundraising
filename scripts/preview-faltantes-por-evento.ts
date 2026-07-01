/**
 * Para cada evento, lista EXACTAMENTE quien estaria por agregar.
 * Sirve para auditar antes de invitar-todos-eventos.ts (no modifica nada).
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";
import { google } from "googleapis";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const ADMIN_EMAIL = "gnb@teknobuilding.com";
const FOUNDERS_TBL = "tblTif15ehnRN4K74";
const CLASES_TBL = "tblHRJ35xMM3rQa85";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

function getOAuth() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

async function main() {
  // Si pasan un solo prefijo (S1, S2, S3) filtra a ese evento
  const onlyPrefix = process.argv.slice(2).find((a) => !a.startsWith("--"))?.toUpperCase();

  const foundersRecs = await base(FOUNDERS_TBL)
    .select({ filterByFormula: `{portal_access} = 1`, fields: ["email", "first_name", "last_name"] })
    .all();
  const byEmail = new Map<string, { id: string; email: string; first_name: string; last_name: string }>();
  for (const r of foundersRecs) {
    const f = r.fields as any;
    const email = ((f.email as string) ?? "").toLowerCase().trim();
    if (!email || email === ADMIN_EMAIL.toLowerCase()) continue;
    if (!byEmail.has(email)) byEmail.set(email, { id: r.id, email, first_name: (f.first_name as string) ?? "", last_name: (f.last_name as string) ?? "" });
  }
  const founders = [...byEmail.values()];

  const clases = await base(CLASES_TBL)
    .select({ fields: ["titulo", "fecha", "calendar_event_id"], filterByFormula: `{calendar_event_id} != ""`, sort: [{ field: "fecha" }] })
    .all();
  const eventos = clases
    .map((c) => {
      const cf = c.fields as any;
      const titulo = (cf.titulo as string) ?? "";
      const prefix = titulo.split(/[\s—-]/)[0].toUpperCase();
      return { titulo, prefix, eventId: cf.calendar_event_id as string };
    })
    .filter((e) => (onlyPrefix ? e.prefix === onlyPrefix : true));

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  console.log(`Founders elegibles: ${founders.length}, eventos a auditar: ${eventos.length}\n`);

  for (const ev of eventos) {
    const r = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: ev.eventId });
    const actuales = r.data.attendees ?? [];
    const actualesSet = new Set(actuales.map((a) => (a.email ?? "").toLowerCase()).filter(Boolean));
    const faltantes = founders.filter((f) => !actualesSet.has(f.email));
    const yaEstan = founders.filter((f) => actualesSet.has(f.email));

    console.log(`=== ${ev.titulo} ===`);
    console.log(`  attendees actuales en Calendar: ${actuales.length}`);
    console.log(`  founders elegibles ya como attendees (NO se invitan): ${yaEstan.length}`);
    console.log(`  founders que SI se invitarian: ${faltantes.length}`);
    if (faltantes.length > 0 && faltantes.length <= 15) {
      console.log(`  Lista:`);
      faltantes.forEach((f, i) => console.log(`    ${i + 1}. ${f.email} | ${f.first_name} ${f.last_name}`));
    } else if (faltantes.length > 15) {
      console.log(`  Primeros 5:`);
      faltantes.slice(0, 5).forEach((f, i) => console.log(`    ${i + 1}. ${f.email} | ${f.first_name} ${f.last_name}`));
      console.log(`    ... y ${faltantes.length - 5} mas`);
    }
    console.log();
  }
}
main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

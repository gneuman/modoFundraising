/**
 * Para CADA founder con portal_access=true, cuenta en cuantos de los 26 eventos esta
 * como attendee. Asi vemos quien tiene solo S1+S2 y quien tiene los 26.
 *
 * Output:
 *   - Tabla: email | nombre | eventos_actuales (0-26) | invitado_calendar_at
 *   - Resumen: cuantos en 26/26, cuantos en 2/26, otros casos
 *   - Lista de quien necesita los 24 eventos restantes (S3-S26)
 */
import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);
const ADMIN_EMAIL = "gnb@teknobuilding.com";

function getOAuth() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

async function main() {
  // 1. Founders con portal_access
  const foundersRecs = await base("Founders MF26")
    .select({
      filterByFormula: `{portal_access} = 1`,
      fields: ["email", "first_name", "last_name", "onboarding_enviado_at", "invitado_calendar_at"],
    })
    .all();
  const founders = foundersRecs
    .map((r) => {
      const f = r.fields as any;
      return {
        id: r.id,
        email: ((f.email as string) ?? "").toLowerCase(),
        first_name: (f.first_name as string) ?? "",
        last_name: (f.last_name as string) ?? "",
        onboarding_enviado_at: f.onboarding_enviado_at as string | undefined,
        invitado_calendar_at: f.invitado_calendar_at as string | undefined,
      };
    })
    .filter((f) => f.email && f.email !== ADMIN_EMAIL.toLowerCase());

  console.log(`Founders con portal_access (sin admin): ${founders.length}`);

  // 2. Eventos
  const clases = await base("Clases MF26")
    .select({ fields: ["titulo", "fecha", "calendar_event_id"], filterByFormula: `{calendar_event_id} != ""`, sort: [{ field: "fecha" }] })
    .all();
  const eventos = clases.map((c) => {
    const cf = c.fields as any;
    const titulo = (cf.titulo as string) ?? "";
    const prefix = titulo.split(/[\s—-]/)[0].toUpperCase();
    return { titulo, prefix, eventId: cf.calendar_event_id as string };
  });
  console.log(`Eventos en Calendar: ${eventos.length}\n`);

  // 3. Cargar attendees de cada evento (1 sola vez, NO por founder)
  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  const attendeesPorEvento = new Map<string, Set<string>>(); // eventId -> set de emails (lowercase)
  for (const ev of eventos) {
    try {
      const r = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: ev.eventId });
      const set = new Set<string>();
      for (const a of r.data.attendees ?? []) {
        if (a.email) set.add(a.email.toLowerCase());
      }
      attendeesPorEvento.set(ev.eventId, set);
    } catch (err: any) {
      console.log(`  WARN no pude leer ${ev.titulo}: ${err.message ?? err}`);
      attendeesPorEvento.set(ev.eventId, new Set());
    }
  }

  // 4. Cruce: para cada founder, en cuantos eventos esta
  type Row = {
    email: string;
    nombre: string;
    enCuantos: number;
    cuales: string[];
    falta: { titulo: string; eventId: string; prefix: string }[];
    onboarding_enviado_at?: string;
    invitado_calendar_at?: string;
  };
  const rows: Row[] = founders.map((f) => {
    const cuales: string[] = [];
    const falta: { titulo: string; eventId: string; prefix: string }[] = [];
    for (const ev of eventos) {
      if (attendeesPorEvento.get(ev.eventId)?.has(f.email)) cuales.push(ev.prefix);
      else falta.push(ev);
    }
    return {
      email: f.email,
      nombre: `${f.first_name} ${f.last_name}`.trim(),
      enCuantos: cuales.length,
      cuales,
      falta,
      onboarding_enviado_at: f.onboarding_enviado_at,
      invitado_calendar_at: f.invitado_calendar_at,
    };
  });

  // 5. Distribucion
  const distrib = new Map<number, number>();
  for (const r of rows) distrib.set(r.enCuantos, (distrib.get(r.enCuantos) ?? 0) + 1);
  console.log("=== Distribucion: cuantos founders estan en cuantos eventos ===");
  for (const [n, count] of [...distrib.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${count} founders -> ${n}/${eventos.length} eventos`);
  }

  // 6. Detalle: los que faltan invitar a algun evento
  const necesitanInvite = rows.filter((r) => r.falta.length > 0).sort((a, b) => b.enCuantos - a.enCuantos);
  console.log(`\n=== Founders que necesitan ser agregados a eventos faltantes: ${necesitanInvite.length} ===\n`);
  for (const r of necesitanInvite) {
    const oks = r.cuales.length ? r.cuales.join(",") : "(ninguno)";
    const faltan = r.falta.map((e) => e.prefix).join(",");
    console.log(`${r.email} | ${r.nombre} | en=${r.enCuantos}/${eventos.length} (${oks}) | falta=${r.falta.length} (${faltan})`);
  }

  // 7. Founders que YA estan en los 26 (no hacer nada)
  const completos = rows.filter((r) => r.falta.length === 0);
  if (completos.length) {
    console.log(`\n=== Founders ya en TODOS los eventos: ${completos.length} ===`);
    for (const r of completos) console.log(`  ${r.email} | ${r.nombre}`);
  }

  // 8. Founders que NO estan en NINGUN evento (raro: portal_access=true pero 0 invites)
  const ceroInvites = rows.filter((r) => r.enCuantos === 0);
  if (ceroInvites.length) {
    console.log(`\n=== ALERTA: portal_access=true pero NO estan en ningun evento: ${ceroInvites.length} ===`);
    for (const r of ceroInvites) console.log(`  ${r.email} | ${r.nombre} | onboarding=${r.onboarding_enviado_at ? "si" : "NO"} | invitado_calendar_at=${r.invitado_calendar_at ?? "(vacio)"}`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

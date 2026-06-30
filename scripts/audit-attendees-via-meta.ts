/**
 * Misma audit que audit-attendees-por-evento.ts, pero leyendo Clases MF26
 * via Meta API (porque el PAT actual perdio acceso a esa tabla).
 */
import Airtable from "airtable";
import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const base = new Airtable({ apiKey: PAT }).base(BASE_ID);
const ADMIN_EMAIL = "gnb@teknobuilding.com";

function getOAuth() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

async function getClasesViaMeta(): Promise<{ titulo: string; prefix: string; eventId: string }[]> {
  // Leemos Clases MF26 directo por tableId (estable aunque renombren la tabla).
  const clases = await base("tblHRJ35xMM3rQa85")
    .select({ fields: ["titulo", "calendar_event_id"], filterByFormula: `{calendar_event_id} != ""`, sort: [{ field: "fecha" }] })
    .all();
  return clases.map((r) => {
    const titulo = ((r.fields as any).titulo as string) ?? "";
    const eventId = (r.fields as any).calendar_event_id as string;
    const prefix = titulo.split(/[\s—-]/)[0].toUpperCase();
    return { titulo, prefix, eventId };
  });
}

async function main() {
  const foundersRecs = await base("tblTif15ehnRN4K74")
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

  let eventos;
  try {
    eventos = await getClasesViaMeta();
    console.log(`Eventos en Calendar (via Meta): ${eventos.length}\n`);
  } catch (e: any) {
    console.error(`No pude leer Clases MF26: ${e.message}`);
    console.error(`SOLUCION: dale acceso al PAT a la tabla Clases MF26 en https://airtable.com/create/tokens`);
    process.exit(1);
  }

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  const attendeesPorEvento = new Map<string, Set<string>>();
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

  const distrib = new Map<number, number>();
  for (const r of rows) distrib.set(r.enCuantos, (distrib.get(r.enCuantos) ?? 0) + 1);
  console.log("=== Distribucion: cuantos founders estan en cuantos eventos ===");
  for (const [n, count] of [...distrib.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${count} founders -> ${n}/${eventos.length} eventos`);
  }

  const necesitanInvite = rows.filter((r) => r.falta.length > 0).sort((a, b) => b.enCuantos - a.enCuantos);
  console.log(`\n=== Founders que necesitan invite a eventos faltantes: ${necesitanInvite.length} ===\n`);
  for (const r of necesitanInvite) {
    const oks = r.cuales.length ? r.cuales.join(",") : "(ninguno)";
    const faltan = r.falta.map((e) => e.prefix).join(",");
    console.log(`${r.email} | ${r.nombre} | en=${r.enCuantos}/${eventos.length} (${oks}) | falta=${r.falta.length} (${faltan})`);
  }

  const completos = rows.filter((r) => r.falta.length === 0);
  if (completos.length) {
    console.log(`\n=== Founders ya en TODOS los eventos: ${completos.length} ===`);
    for (const r of completos) console.log(`  ${r.email} | ${r.nombre}`);
  }

  const ceroInvites = rows.filter((r) => r.enCuantos === 0);
  if (ceroInvites.length) {
    console.log(`\n=== ALERTA: portal_access=true pero NO estan en ningun evento: ${ceroInvites.length} ===`);
    for (const r of ceroInvites) console.log(`  ${r.email} | ${r.nombre} | onboarding=${r.onboarding_enviado_at ? "si" : "NO"}`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

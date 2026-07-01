/**
 * Invita a TODOS los founders con portal_access=true a TODOS los eventos del Calendar
 * que les falten. Optimizado para minimizar requests y respetar rate limits.
 *
 * ESTRATEGIA:
 * Procesa POR EVENTO (no por founder), porque agregar N attendees a 1 evento
 * cuesta 1 sola PATCH request a Calendar API (no N). Esto es ~30x mas eficiente.
 *
 * Para cada evento:
 *   1. GET attendees actuales
 *   2. Calcula quienes faltan agregar (excluye duplicados, excluye los ya invitados)
 *   3. 1 PATCH con todos los nuevos attendees + sendUpdates="all" -> Google manda 1 mail por nuevo attendee
 *   4. Espera --sleep-eventos segundos antes del proximo evento
 *
 * IDEMPOTENTE: si un founder ya esta como attendee, no lo re-agrega.
 * No-bloqueante: si un PATCH falla, salta al siguiente y reporta al final.
 *
 * Marca invitado_calendar_at en Airtable solo cuando un founder queda agregado
 * a AL MENOS un evento nuevo en esta corrida.
 *
 * Uso:
 *   npx tsx scripts/invitar-todos-eventos.ts --dry-run                     # solo reporta
 *   npx tsx scripts/invitar-todos-eventos.ts --sleep-eventos=30            # 30s entre eventos (default)
 *   npx tsx scripts/invitar-todos-eventos.ts --only-prefix=S3,S4,S5        # solo invita a esos eventos
 *   npx tsx scripts/invitar-todos-eventos.ts --exclude-emails=foo@bar.com  # excluye founders
 *   npx tsx scripts/invitar-todos-eventos.ts --max-attendees-per-event=10  # corta por evento (testing)
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";
import { google } from "googleapis";
import { markFoundersAsInvited } from "@/lib/airtable";

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
function sleep(ms: number) { return new Promise((res) => setTimeout(res, ms)); }
function nowCdmx() { return new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }); }

interface Args {
  dry: boolean;
  sleepEventos: number;
  onlyPrefix: string[] | null;
  excludeEmails: Set<string>;
  maxAttendeesPerEvent: number | null;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const get = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  return {
    dry: args.includes("--dry-run"),
    sleepEventos: get("sleep-eventos") ? parseInt(get("sleep-eventos")!, 10) : 30,
    onlyPrefix: get("only-prefix") ? get("only-prefix")!.split(",").map((s) => s.trim().toUpperCase()) : null,
    excludeEmails: new Set((get("exclude-emails") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).concat([ADMIN_EMAIL.toLowerCase()])),
    maxAttendeesPerEvent: get("max-attendees-per-event") ? parseInt(get("max-attendees-per-event")!, 10) : null,
  };
}

async function main() {
  const opts = parseArgs();

  // 1. Founders con portal_access (dedupe por email lowercase, primer record gana)
  const foundersRecs = await base(FOUNDERS_TBL)
    .select({ filterByFormula: `{portal_access} = 1`, fields: ["email", "first_name", "last_name"] })
    .all();
  const byEmail = new Map<string, { id: string; email: string; first_name: string }>();
  for (const r of foundersRecs) {
    const f = r.fields as any;
    const email = ((f.email as string) ?? "").toLowerCase().trim();
    if (!email || opts.excludeEmails.has(email)) continue;
    if (!byEmail.has(email)) {
      byEmail.set(email, { id: r.id, email, first_name: (f.first_name as string) ?? "" });
    }
  }
  const founders = [...byEmail.values()];

  // 2. Eventos
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
    .filter((e) => (opts.onlyPrefix ? opts.onlyPrefix.includes(e.prefix) : true));

  console.log(`[invitar-todos] founders elegibles: ${founders.length} (deduplicados por email, sin admin)`);
  console.log(`[invitar-todos] eventos a procesar: ${eventos.length}${opts.onlyPrefix ? ` (filtrados por ${opts.onlyPrefix.join(",")})` : ""}`);
  console.log(`[invitar-todos] sleep entre eventos: ${opts.sleepEventos}s`);
  console.log(`[invitar-todos] excluidos: ${[...opts.excludeEmails].join(", ")}`);
  console.log(`[invitar-todos] dry-run: ${opts.dry}\n`);

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  // 3. Para cada evento, calcular faltantes y patchar
  const founderIdsConCambios = new Set<string>(); // founders que quedaron agregados a >=1 evento
  let totalAgregados = 0;
  let totalSkipped = 0;
  let eventosFallidos = 0;
  const fallos: { evento: string; error: string }[] = [];
  let estimadoMails = 0;

  for (let i = 0; i < eventos.length; i++) {
    const ev = eventos[i];
    process.stdout.write(`[${nowCdmx()}] [${i + 1}/${eventos.length}] ${ev.titulo} ... `);
    try {
      const r = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: ev.eventId });
      const actuales = r.data.attendees ?? [];
      const actualesSet = new Set(actuales.map((a) => (a.email ?? "").toLowerCase()).filter(Boolean));

      let faltantes = founders.filter((f) => !actualesSet.has(f.email));
      if (opts.maxAttendeesPerEvent != null && faltantes.length > opts.maxAttendeesPerEvent) {
        faltantes = faltantes.slice(0, opts.maxAttendeesPerEvent);
      }

      if (faltantes.length === 0) {
        console.log(`SKIP (los ${founders.length} ya estan)`);
        totalSkipped++;
        continue;
      }

      estimadoMails += faltantes.length;

      if (opts.dry) {
        console.log(`DRY-RUN: agregaria ${faltantes.length} founders -> ${faltantes.length} mails desde admin@impacta.vc`);
        continue;
      }

      const nuevosAttendees = faltantes.map((f) => ({ email: f.email }));
      await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId: ev.eventId,
        sendUpdates: "all",
        requestBody: {
          attendees: [...actuales, ...nuevosAttendees],
          guestsCanSeeOtherGuests: false,
          guestsCanInviteOthers: false,
        },
      });
      console.log(`OK: ${faltantes.length} agregados`);
      totalAgregados += faltantes.length;
      for (const f of faltantes) founderIdsConCambios.add(f.id);
    } catch (err: any) {
      console.log(`FAIL ${err.message ?? err}`);
      eventosFallidos++;
      fallos.push({ evento: ev.titulo, error: err.message ?? String(err) });
    }

    if (i < eventos.length - 1) {
      console.log(`   durmiendo ${opts.sleepEventos}s antes del proximo evento...`);
      await sleep(opts.sleepEventos * 1000);
    }
  }

  console.log(`\n[invitar-todos] resumen:`);
  console.log(`  eventos OK procesados:        ${eventos.length - eventosFallidos - totalSkipped}`);
  console.log(`  eventos skipped (ya completo): ${totalSkipped}`);
  console.log(`  eventos fallidos:             ${eventosFallidos}`);
  console.log(`  invitaciones totales agregadas: ${totalAgregados}`);
  console.log(`  founders con >=1 cambio:       ${founderIdsConCambios.size}`);
  console.log(`  estimado mails enviados:       ${estimadoMails}`);

  if (fallos.length) {
    console.log(`\nFallos:`);
    for (const f of fallos) console.log(`  - ${f.evento}: ${f.error}`);
    console.log(`Re-corre el script para reintentar (es idempotente).`);
  }

  // 4. Marcar invitado_calendar_at en Airtable
  if (!opts.dry && founderIdsConCambios.size > 0) {
    console.log(`\nMarcando invitado_calendar_at en ${founderIdsConCambios.size} founders...`);
    await markFoundersAsInvited([...founderIdsConCambios], ADMIN_EMAIL);
    console.log(`OK.`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

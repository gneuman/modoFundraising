/**
 * Version SEGURA de invitar-todos-eventos.ts.
 *
 * Diferencias vs el original:
 * - Chunks: agrega como max 15 attendees nuevos por PATCH (no los 70 de golpe).
 * - Sleep entre chunks DENTRO de un evento: 10s (mata picos de mail outbound).
 * - Sleep entre eventos: 300s = 5min (default) para que la reputacion del dominio descanse.
 * - Retries con backoff exponencial: 3 intentos (2s, 5s, 15s) ante errores transitorios.
 * - Reporta progreso fino (cada chunk).
 *
 * Volumen: ~13 mails/min promedio durante ~2.5 horas (muy debajo de spam thresholds).
 *
 * Uso:
 *   npx tsx scripts/invitar-todos-seguro.ts --dry-run
 *   npx tsx scripts/invitar-todos-seguro.ts                        # ejecucion real
 *   npx tsx scripts/invitar-todos-seguro.ts --chunk=15 --sleep-chunk=10 --sleep-evento=300
 *   npx tsx scripts/invitar-todos-seguro.ts --only-prefix=S3,S4    # solo esos eventos
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
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Retry con backoff para PATCH (errores transitorios 5xx, 429, ECONNRESET).
async function patchWithRetry(
  calendar: ReturnType<typeof google.calendar>,
  eventId: string,
  attendees: { email: string }[],
): Promise<void> {
  const delays = [2000, 5000, 15000];
  let lastErr: any;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId,
        sendUpdates: "all",
        requestBody: {
          attendees,
          guestsCanSeeOtherGuests: false,
          guestsCanInviteOthers: false,
        },
      });
      return;
    } catch (err: any) {
      lastErr = err;
      const code = err.code ?? err.response?.status;
      const transient = code === 429 || code === 500 || code === 502 || code === 503 || code === 504 || err.code === "ECONNRESET";
      if (!transient || attempt === delays.length) throw err;
      await sleep(delays[attempt]);
    }
  }
  throw lastErr;
}

interface Args {
  dry: boolean;
  sleepEvento: number;
  sleepChunk: number;
  chunkSize: number;
  onlyPrefix: string[] | null;
  skipPrefix: Set<string>;
  excludeEmails: Set<string>;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const get = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  return {
    dry: args.includes("--dry-run"),
    sleepEvento: get("sleep-evento") ? parseInt(get("sleep-evento")!, 10) : 300,
    sleepChunk: get("sleep-chunk") ? parseInt(get("sleep-chunk")!, 10) : 10,
    chunkSize: get("chunk") ? parseInt(get("chunk")!, 10) : 15,
    onlyPrefix: get("only-prefix") ? get("only-prefix")!.split(",").map((s) => s.trim().toUpperCase()) : null,
    skipPrefix: new Set((get("skip-prefix") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)),
    excludeEmails: new Set(
      (get("exclude-emails") ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .concat([ADMIN_EMAIL.toLowerCase()]),
    ),
  };
}

async function main() {
  const opts = parseArgs();

  // 1. Founders con portal_access (dedupe por email lowercase)
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
    .filter((e) => (opts.onlyPrefix ? opts.onlyPrefix.includes(e.prefix) : true))
    .filter((e) => !opts.skipPrefix.has(e.prefix));

  console.log(`[seguro] founders elegibles: ${founders.length} (deduplicados, sin admin)`);
  const filtroDesc = [
    opts.onlyPrefix ? `only=${opts.onlyPrefix.join(",")}` : null,
    opts.skipPrefix.size ? `skip=${[...opts.skipPrefix].join(",")}` : null,
  ].filter(Boolean).join(" ");
  console.log(`[seguro] eventos a procesar: ${eventos.length}${filtroDesc ? ` (${filtroDesc})` : ""}`);
  console.log(`[seguro] chunk-size=${opts.chunkSize}  sleep-chunk=${opts.sleepChunk}s  sleep-evento=${opts.sleepEvento}s`);
  console.log(`[seguro] retries: 3 con backoff 2s/5s/15s para 429/5xx/ECONNRESET`);
  console.log(`[seguro] excluidos: ${[...opts.excludeEmails].join(", ")}`);
  console.log(`[seguro] dry-run: ${opts.dry}\n`);

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  const founderIdsConCambios = new Set<string>();
  let totalAgregados = 0;
  let totalSkipped = 0;
  let eventosFallidos = 0;
  const fallos: { evento: string; error: string }[] = [];
  let estimadoMails = 0;
  const inicio = Date.now();

  for (let i = 0; i < eventos.length; i++) {
    const ev = eventos[i];
    console.log(`\n[${nowCdmx()}] [${i + 1}/${eventos.length}] ${ev.titulo}`);

    try {
      // GET attendees actuales una vez
      const r = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: ev.eventId });
      const actuales = r.data.attendees ?? [];
      const actualesSet = new Set(actuales.map((a) => (a.email ?? "").toLowerCase()).filter(Boolean));
      const faltantes = founders.filter((f) => !actualesSet.has(f.email));

      if (faltantes.length === 0) {
        console.log(`   SKIP (todos los ${founders.length} elegibles ya estan en el evento)`);
        totalSkipped++;
        continue;
      }

      console.log(`   attendees actuales=${actuales.length}, faltantes=${faltantes.length}`);
      estimadoMails += faltantes.length;

      if (opts.dry) {
        const chunks = chunk(faltantes, opts.chunkSize);
        console.log(`   DRY-RUN: ${chunks.length} chunks de hasta ${opts.chunkSize}, mandaria ${faltantes.length} mails`);
        continue;
      }

      // Agregar por chunks. Mantenemos los attendees acumulados en memoria
      // para que cada PATCH mande solo el conjunto creciente sin re-incluir
      // los que se acaban de agregar (lo que generaria duplicados o mails fantasma).
      let acumulado = [...actuales];
      const chunks = chunk(faltantes, opts.chunkSize);
      for (let ci = 0; ci < chunks.length; ci++) {
        const chk = chunks[ci];
        const nuevos = chk.map((f) => ({ email: f.email }));
        const todos = [...acumulado, ...nuevos];
        process.stdout.write(`   chunk ${ci + 1}/${chunks.length} (${chk.length} attendees) ... `);
        await patchWithRetry(calendar, ev.eventId, todos);
        console.log(`OK`);
        acumulado = todos;
        totalAgregados += chk.length;
        for (const f of chk) founderIdsConCambios.add(f.id);

        if (ci < chunks.length - 1) {
          console.log(`      sleep ${opts.sleepChunk}s antes del proximo chunk...`);
          await sleep(opts.sleepChunk * 1000);
        }
      }
    } catch (err: any) {
      console.log(`   FAIL ${err.message ?? err}`);
      eventosFallidos++;
      fallos.push({ evento: ev.titulo, error: err.message ?? String(err) });
    }

    // Sleep entre eventos (no en el ultimo)
    if (i < eventos.length - 1) {
      const minLeft = Math.round(((eventos.length - 1 - i) * opts.sleepEvento) / 60);
      console.log(`   durmiendo ${opts.sleepEvento}s antes del proximo evento... (quedan ~${minLeft}min)`);
      await sleep(opts.sleepEvento * 1000);
    }
  }

  const minutos = ((Date.now() - inicio) / 60000).toFixed(1);
  console.log(`\n[seguro] resumen:`);
  console.log(`  eventos procesados con cambios: ${eventos.length - eventosFallidos - totalSkipped}`);
  console.log(`  eventos skipped (sin cambios):  ${totalSkipped}`);
  console.log(`  eventos fallidos:               ${eventosFallidos}`);
  console.log(`  invitaciones agregadas:         ${totalAgregados}`);
  console.log(`  founders con >=1 cambio:        ${founderIdsConCambios.size}`);
  console.log(`  estimado mails enviados:        ${estimadoMails}`);
  console.log(`  tiempo total:                   ${minutos}min`);

  if (fallos.length) {
    console.log(`\nFallos:`);
    for (const f of fallos) console.log(`  - ${f.evento}: ${f.error}`);
    console.log(`Re-corre para reintentar (es idempotente).`);
  }

  if (!opts.dry && founderIdsConCambios.size > 0) {
    console.log(`\nMarcando invitado_calendar_at en ${founderIdsConCambios.size} founders...`);
    await markFoundersAsInvited([...founderIdsConCambios], ADMIN_EMAIL);
    console.log(`OK.`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

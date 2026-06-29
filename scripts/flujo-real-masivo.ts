/**
 * Loop masivo: para CADA founder pendiente, ejecuta el flujo real:
 *   1. Manda correo de onboarding (sendOnboardingEmail)
 *   2. Marca onboarding_enviado_at = now
 *   3. Lo agrega a los eventos del calendar indicados por --keep (default S1,S2)
 *      sendUpdates=all -> Google manda 1 invitacion por evento.
 *   4. Marca invitado_calendar_at + invitado_calendar_by
 *
 * Pendiente = portal_access=1 AND onboarding_enviado_at vacio.
 * Excluye al admin.
 *
 * Idempotente: si Ctrl+C, re-correr retoma desde el siguiente sin remandar.
 *
 * Uso:
 *   npx tsx scripts/flujo-real-masivo.ts                       # default keep=S1,S2 sleep=60s entre founders, 1.5s entre eventos
 *   npx tsx scripts/flujo-real-masivo.ts --keep=S1,S2 --sleep=60 --sleep-eventos=1500
 *   npx tsx scripts/flujo-real-masivo.ts --max=5               # corta a los 5 primeros
 *   npx tsx scripts/flujo-real-masivo.ts --dry-run
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";
import { google } from "googleapis";
import { markFounderOnboardingSent, markFoundersAsInvited } from "@/lib/airtable";
import { sendOnboardingEmail } from "@/lib/email-engine";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
const PORTAL_URL = `${APP_URL}/portal`;
const ADMIN_EMAIL = "gnb@teknobuilding.com";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

function getOAuth() {
  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}
function sleep(ms: number) { return new Promise((res) => setTimeout(res, ms)); }
function ahoraCdmx() { return new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }); }

interface Args {
  keep: string[] | null;
  sleepFounders: number;
  sleepEventos: number;
  max: number;
  dry: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const keepArg = args.find((a) => a.startsWith("--keep="));
  const sleepArg = args.find((a) => a.startsWith("--sleep="));
  const sleepEvArg = args.find((a) => a.startsWith("--sleep-eventos="));
  const maxArg = args.find((a) => a.startsWith("--max="));
  return {
    keep: keepArg ? keepArg.slice("--keep=".length).split(",").map((s) => s.trim().toUpperCase()) : ["S1", "S2"],
    sleepFounders: sleepArg ? parseInt(sleepArg.slice("--sleep=".length), 10) : 60,
    sleepEventos: sleepEvArg ? parseInt(sleepEvArg.slice("--sleep-eventos=".length), 10) : 1500,
    max: maxArg ? parseInt(maxArg.slice("--max=".length), 10) : Infinity,
    dry: args.includes("--dry-run"),
  };
}

async function getEventosKeep(keep: string[] | null) {
  const clases = await base("Clases MF26")
    .select({ fields: ["titulo", "fecha", "calendar_event_id"], filterByFormula: `{calendar_event_id} != ""`, sort: [{ field: "fecha" }] })
    .all();
  return clases
    .map((c) => {
      const cf = c.fields as any;
      const titulo = (cf.titulo as string) ?? "";
      const prefix = titulo.split(/[\s—-]/)[0].toUpperCase();
      return { titulo, prefix, eventId: cf.calendar_event_id as string };
    })
    .filter((e) => (keep ? keep.includes(e.prefix) : true));
}

async function getNextPendiente() {
  const recs = await base("Founders MF26")
    .select({
      filterByFormula: `AND({portal_access} = 1, {onboarding_enviado_at} = "")`,
      fields: ["email", "first_name", "last_name"],
    })
    .all();
  const eligibles = recs.filter((r) => {
    const email = ((r.fields as any).email ?? "").toLowerCase();
    return email && email !== ADMIN_EMAIL.toLowerCase();
  });
  if (!eligibles.length) return null;
  const r = eligibles[0];
  const f = r.fields as any;
  return {
    id: r.id,
    email: (f.email as string).toLowerCase(),
    first_name: (f.first_name as string) || "founder",
    last_name: (f.last_name as string) ?? "",
    pendientes: eligibles.length,
  };
}

async function procesarFounder(
  founder: { id: string; email: string; first_name: string },
  eventos: { titulo: string; eventId: string }[],
  sleepEventos: number,
  calendar: ReturnType<typeof google.calendar>,
  dry: boolean,
): Promise<{ ok: number; skipped: number; failed: number; correoOk: boolean }> {
  // 1. Correo
  console.log(`    -> correo onboarding...`);
  if (!dry) {
    try {
      await sendOnboardingEmail(founder.email, founder.first_name, PORTAL_URL);
      console.log(`       OK enviado`);
    } catch (e: any) {
      console.log(`       FAIL ${e.message ?? e}`);
      // Si el correo falla, NO marcamos onboarding_enviado_at -> se reintenta en la proxima vuelta.
      return { ok: 0, skipped: 0, failed: 0, correoOk: false };
    }
  } else {
    console.log(`       DRY-RUN: no envio`);
  }

  // 2. Marcar onboarding
  if (!dry) await markFounderOnboardingSent(founder.id);

  // 3. Calendar serial
  let ok = 0, skipped = 0, failed = 0;
  for (let i = 0; i < eventos.length; i++) {
    const { titulo, eventId } = eventos[i];
    process.stdout.write(`    -> calendar [${i + 1}/${eventos.length}] ${titulo} ... `);
    if (dry) { console.log("DRY-RUN: skip"); continue; }
    try {
      const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      const attendees = ev.data.attendees ?? [];
      if (attendees.some((a) => a.email?.toLowerCase() === founder.email)) {
        console.log("SKIP (ya estaba)");
        skipped++;
      } else {
        await calendar.events.patch({
          calendarId: CALENDAR_ID,
          eventId,
          sendUpdates: "all",
          requestBody: {
            attendees: [...attendees, { email: founder.email }],
            guestsCanSeeOtherGuests: false,
            guestsCanInviteOthers: false,
          },
        });
        console.log("OK invitado");
        ok++;
      }
    } catch (err: any) {
      console.log(`FAIL ${err.message ?? err}`);
      failed++;
    }
    if (i < eventos.length - 1) await sleep(sleepEventos);
  }

  // 4. Marcar invitado_calendar_at SOLO si no hubo fallos
  if (!dry && failed === 0) {
    await markFoundersAsInvited([founder.id], ADMIN_EMAIL);
  }

  return { ok, skipped, failed, correoOk: true };
}

async function main() {
  const opts = parseArgs();
  const eventos = await getEventosKeep(opts.keep);
  if (!eventos.length) { console.error("No hay eventos que coincidan con --keep"); process.exit(1); }

  console.log(`[masivo] keep=${opts.keep?.join(",") ?? "todos"} eventos=${eventos.length}`);
  console.log(`[masivo] sleep entre founders=${opts.sleepFounders}s entre eventos=${opts.sleepEventos}ms`);
  console.log(`[masivo] max=${opts.max === Infinity ? "Infinito" : opts.max} dry=${opts.dry}`);
  console.log(`[masivo] admin excluido=${ADMIN_EMAIL}`);
  console.log(`[masivo] Ctrl+C para pausar. Re-correr retoma desde el siguiente pendiente.\n`);

  const calendar = google.calendar({ version: "v3", auth: getOAuth() });

  let procesados = 0;
  let totalOk = 0;
  let totalFailedCorreo = 0;
  let totalFailedCal = 0;
  const inicio = Date.now();

  while (procesados < opts.max) {
    const next = await getNextPendiente();
    if (!next) { console.log("\n[masivo] OK: no quedan pendientes. Termino."); break; }

    console.log(`\n[${ahoraCdmx()}] #${procesados + 1} -> ${next.email} | ${next.first_name} ${next.last_name} | quedan ${next.pendientes} (incl. este)`);

    const r = await procesarFounder(next, eventos, opts.sleepEventos, calendar, opts.dry);
    if (!r.correoOk) {
      totalFailedCorreo++;
      console.log(`    SKIP founder (correo fallo, NO marco, reintentara en la proxima vuelta)`);
      // En dry no avanzamos para no entrar en loop infinito.
      if (opts.dry) break;
      // Pausa antes de reintentar otro
      await sleep(opts.sleepFounders * 1000);
      continue;
    }
    if (r.failed > 0) totalFailedCal += r.failed;
    totalOk++;

    procesados++;
    if (procesados >= opts.max) { console.log(`\n[masivo] llegamos al max=${opts.max}. Termino.`); break; }

    // En dry-run no esperamos el sleep largo, solo procesamos 1 para verificar.
    if (opts.dry) { console.log(`[masivo] dry-run: procesamos 1 founder y cortamos.`); break; }

    console.log(`    durmiendo ${opts.sleepFounders}s antes del proximo founder...`);
    await sleep(opts.sleepFounders * 1000);
  }

  const minutos = ((Date.now() - inicio) / 60000).toFixed(1);
  console.log(`\n[masivo] resumen: procesados=${procesados} ok=${totalOk} correosFallidos=${totalFailedCorreo} calendarFallidos=${totalFailedCal} tiempo=${minutos}min`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

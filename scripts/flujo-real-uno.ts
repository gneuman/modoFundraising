/**
 * Flujo real para UN founder (test end-to-end):
 *   1. Manda correo de onboarding (sendOnboardingEmail).
 *   2. Marca onboarding_enviado_at = now.
 *   3. Lo agrega a los eventos del calendar indicados con --keep (default: todos los 26).
 *      sendUpdates=all -> Google manda 1 invitacion por evento.
 *      Serial con sleep para evitar rate limit.
 *   4. Marca invitado_calendar_at = now SOLO si no hubo fallos.
 *
 * Uso:
 *   npx tsx scripts/flujo-real-uno.ts <founderId|email> [--keep=S1,S2] [--sleep=1500] [--dry-run]
 *
 * Ejemplo:
 *   npx tsx scripts/flujo-real-uno.ts neumang@gmail.com --keep=S1,S2
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

async function main() {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith("--"))?.trim();
  const keepArg = args.find((a) => a.startsWith("--keep="));
  const sleepArg = args.find((a) => a.startsWith("--sleep="));
  const dry = args.includes("--dry-run");
  const keep = keepArg ? keepArg.slice("--keep=".length).split(",").map((s) => s.trim().toUpperCase()) : null;
  const sleepMs = sleepArg ? parseInt(sleepArg.slice("--sleep=".length), 10) : 1500;

  if (!target) {
    console.error("Uso: npx tsx scripts/flujo-real-uno.ts <founderId|email> [--keep=S1,S2] [--sleep=1500] [--dry-run]");
    process.exit(1);
  }

  // Resolver founder
  let founderRec;
  if (target.startsWith("rec")) {
    founderRec = await base("Founders MF26").find(target);
  } else {
    const recs = await base("Founders MF26")
      .select({ filterByFormula: `LOWER({email}) = "${target.toLowerCase()}"`, maxRecords: 1 })
      .firstPage();
    founderRec = recs[0];
  }
  if (!founderRec) { console.error(`Founder no encontrado: ${target}`); process.exit(1); }

  const f = founderRec.fields as any;
  const email = (f.email as string).toLowerCase();
  const firstName = (f.first_name as string) || "founder";

  // Eventos a invitar
  const clases = await base("Clases MF26")
    .select({ fields: ["titulo", "fecha", "calendar_event_id"], filterByFormula: `{calendar_event_id} != ""`, sort: [{ field: "fecha" }] })
    .all();

  const eventos = clases
    .map((c) => {
      const cf = c.fields as any;
      const titulo = (cf.titulo as string) ?? "";
      const prefix = titulo.split(/[\s—-]/)[0].toUpperCase();
      return { titulo, prefix, eventId: cf.calendar_event_id as string };
    })
    .filter((e) => (keep ? keep.includes(e.prefix) : true));

  console.log(`=== flujo real para: ${email} | ${firstName} (${founderRec.id}) ===`);
  console.log(`   portal_access=${f.portal_access === true}`);
  console.log(`   onboarding_enviado_at=${f.onboarding_enviado_at ?? "(vacio)"}`);
  console.log(`   invitado_calendar_at=${f.invitado_calendar_at ?? "(vacio)"}`);
  console.log(`   keep=${keep ? keep.join(",") : "(todos los 26)"}`);
  console.log(`   eventos seleccionados: ${eventos.length}`);
  eventos.forEach((e) => console.log(`     - ${e.titulo}`));
  console.log(`   sleep=${sleepMs}ms dry=${dry}\n`);

  if (!eventos.length) { console.error("No hay eventos que coincidan con --keep"); process.exit(1); }

  if (dry) {
    console.log(`DRY-RUN. Total mails que recibiria ${email}: 1 onboarding + ${eventos.length} invitaciones de Calendar = ${eventos.length + 1}.`);
    return;
  }

  // 1. Correo
  console.log(`-> 1. Enviando correo de onboarding a ${email}...`);
  await sendOnboardingEmail(email, firstName, PORTAL_URL);
  console.log(`   OK enviado.`);

  // 2. Marcar onboarding
  console.log(`-> 2. Marcando onboarding_enviado_at...`);
  await markFounderOnboardingSent(founderRec.id);
  console.log(`   OK marcado.\n`);

  // 3. Calendar serial
  console.log(`-> 3. Agregando a ${eventos.length} eventos SERIAL con sleep=${sleepMs}ms (sendUpdates=all)...`);
  const calendar = google.calendar({ version: "v3", auth: getOAuth() });
  let ok = 0, skipped = 0, failed = 0;
  const failures: { titulo: string; eventId: string; error: string }[] = [];

  for (let i = 0; i < eventos.length; i++) {
    const { titulo, eventId } = eventos[i];
    process.stdout.write(`   [${i + 1}/${eventos.length}] ${titulo} ... `);
    try {
      const ev = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      const attendees = ev.data.attendees ?? [];
      if (attendees.some((a) => a.email?.toLowerCase() === email)) {
        console.log("SKIP (ya esta)");
        skipped++;
      } else {
        await calendar.events.patch({
          calendarId: CALENDAR_ID,
          eventId,
          sendUpdates: "all",
          requestBody: {
            attendees: [...attendees, { email }],
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
      failures.push({ titulo, eventId, error: err.message ?? String(err) });
    }
    if (i < eventos.length - 1) await sleep(sleepMs);
  }

  console.log(`\n   resumen calendar: ok=${ok} skipped=${skipped} failed=${failed}`);
  if (failed) {
    for (const fl of failures) console.log(`     - ${fl.titulo}: ${fl.error}`);
  }

  // 4. Marcar invitado_calendar_at SOLO si todo OK
  if (failed === 0) {
    console.log(`\n-> 4. Marcando invitado_calendar_at...`);
    await markFoundersAsInvited([founderRec.id], ADMIN_EMAIL);
    console.log(`   OK marcado.`);
  } else {
    console.log(`\n-> 4. NO marco invitado_calendar_at porque hubo ${failed} fallos. Re-corre para reintentar.`);
  }

  console.log(`\n=== LISTO. ${email} deberia recibir: 1 correo de onboarding + ${ok} invitaciones de Calendar = ${ok + 1} mails ===`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

/**
 * Flujo completo para UN founder (test end-to-end):
 *   1. Manda correo de onboarding (sendOnboardingEmail).
 *   2. Marca onboarding_enviado_at = now.
 *   3. Lo agrega a los 26 eventos del calendar con sendUpdates=all (Google manda 26 invitaciones).
 *   4. Marca invitado_calendar_at = now.
 *
 * Uso: npx tsx scripts/flujo-completo-uno.ts <founderId|email> [--dry-run]
 *
 * Ejemplo: npx tsx scripts/flujo-completo-uno.ts neumang@gmail.com
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";
import {
  getCalendarEventIds,
  markFounderOnboardingSent,
  markFoundersAsInvited,
} from "@/lib/airtable";
import { addAttendeesToAllEvents } from "@/lib/calendar";
import { sendOnboardingEmail } from "@/lib/email-engine";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
const PORTAL_URL = `${APP_URL}/portal`;
const ADMIN_EMAIL = "gnb@teknobuilding.com";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith("--"))?.trim();
  const dry = args.includes("--dry-run");
  if (!target) {
    console.error("Uso: npx tsx scripts/flujo-completo-uno.ts <founderId|email> [--dry-run]");
    process.exit(1);
  }

  // Resolver founder por id o email
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
  const email = f.email as string;
  const firstName = (f.first_name as string) || "founder";

  console.log(`=== flujo completo para: ${email} | ${firstName} (${founderRec.id}) ===`);
  console.log(`   portal_access=${f.portal_access === true}`);
  console.log(`   onboarding_enviado_at=${f.onboarding_enviado_at ?? "(vacio)"}`);
  console.log(`   invitado_calendar_at=${f.invitado_calendar_at ?? "(vacio)"}`);
  console.log(`   dry-run=${dry}\n`);

  const eventIds = await getCalendarEventIds();
  console.log(`Calendar: ${eventIds.length} eventos disponibles\n`);

  if (dry) {
    console.log(`DRY-RUN. Plan:`);
    console.log(`  1. sendOnboardingEmail(${email}, "${firstName}", ${PORTAL_URL})`);
    console.log(`  2. markFounderOnboardingSent(${founderRec.id})`);
    console.log(`  3. addAttendeesToAllEvents([${eventIds.length} eventos], [${email}])  -> Google manda ${eventIds.length} invitaciones`);
    console.log(`  4. markFoundersAsInvited([${founderRec.id}], "${ADMIN_EMAIL}")`);
    return;
  }

  // 1. Correo
  console.log(`-> 1. Enviando correo de onboarding...`);
  await sendOnboardingEmail(email, firstName, PORTAL_URL);
  console.log(`   OK enviado.`);

  // 2. Marcar onboarding
  console.log(`-> 2. Marcando onboarding_enviado_at...`);
  await markFounderOnboardingSent(founderRec.id);
  console.log(`   OK marcado.`);

  // 3. Calendar
  console.log(`-> 3. Agregando a los ${eventIds.length} eventos (sendUpdates=all)...`);
  const result = await addAttendeesToAllEvents(eventIds, [email]);
  console.log(`   ok=${result.ok.length} failed=${result.failed.length} skipped=${result.skipped.length}`);
  if (result.failed.length) {
    for (const fail of result.failed.slice(0, 5)) {
      console.log(`     FAIL ${fail.eventId}: ${fail.error}`);
    }
  }

  // 4. Marcar calendar
  console.log(`-> 4. Marcando invitado_calendar_at...`);
  await markFoundersAsInvited([founderRec.id], ADMIN_EMAIL);
  console.log(`   OK marcado.`);

  console.log(`\n=== LISTO. ${email} deberia recibir: 1 correo de onboarding + ${result.ok.length} invitaciones de Google Calendar ===`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

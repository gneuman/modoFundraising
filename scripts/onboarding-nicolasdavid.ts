/**
 * Onboarding puntual para nicolasdavid@gmail.com.
 * 1) Busca el founder por email exacto (case-insensitive).
 * 2) Muestra estado (portal_access, onboarding_enviado_at).
 * 3) Si --send: manda el correo con el first_name real y marca onboarding_enviado_at.
 *
 * Uso:
 *   npx tsx scripts/onboarding-nicolasdavid.ts            # solo busca y reporta
 *   npx tsx scripts/onboarding-nicolasdavid.ts --send     # manda y marca
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";
import { markFounderOnboardingSent } from "@/lib/airtable";
import { sendOnboardingEmail } from "@/lib/email-engine";

const TARGET_EMAIL = "nicolasdavid@gmail.com";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
const PORTAL_URL = `${APP_URL}/portal`;

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  const send = process.argv.includes("--send");
  console.log(`[onboarding-nicolasdavid] target=${TARGET_EMAIL} send=${send} portal_url=${PORTAL_URL}\n`);

  const recs = await base("Founders MF26")
    .select({
      filterByFormula: `LOWER({email}) = "${TARGET_EMAIL.toLowerCase()}"`,
      fields: ["email", "first_name", "last_name", "portal_access", "onboarding_enviado_at"],
    })
    .all();

  if (!recs.length) {
    console.log(`NO encontrado en Founders MF26. Verifica el email o si la postulacion esta admitida.`);
    process.exit(1);
  }
  if (recs.length > 1) {
    console.log(`AVISO: ${recs.length} matches para ese email. Listo y salgo sin mandar.`);
    for (const r of recs) {
      const f = r.fields as any;
      console.log(`  ${r.id} | ${f.email} | ${f.first_name} ${f.last_name ?? ""} | portal_access=${f.portal_access === true} | onboarding_enviado_at=${f.onboarding_enviado_at ?? "(vacio)"}`);
    }
    process.exit(1);
  }

  const r = recs[0];
  const f = r.fields as any;
  const firstName = (f.first_name as string) || "founder";
  const portalAccess = f.portal_access === true;
  const yaEnviado = !!f.onboarding_enviado_at;

  console.log(`MATCH: ${r.id}`);
  console.log(`  email:                  ${f.email}`);
  console.log(`  first_name:             ${firstName}`);
  console.log(`  last_name:              ${f.last_name ?? "(vacio)"}`);
  console.log(`  portal_access:          ${portalAccess}`);
  console.log(`  onboarding_enviado_at:  ${f.onboarding_enviado_at ?? "(vacio)"}\n`);

  if (!portalAccess) {
    console.log(`SALGO: portal_access=false. No mando onboarding a alguien que aun no tiene acceso al portal.`);
    process.exit(1);
  }

  if (yaEnviado && !send) {
    console.log(`AVISO: ya tiene onboarding_enviado_at. Si quieres remandar, corre con --send (se sobreescribe el timestamp).`);
    return;
  }

  if (!send) {
    console.log(`DRY: paso flag --send para mandar y marcar.`);
    return;
  }

  await sendOnboardingEmail(f.email as string, firstName, PORTAL_URL);
  console.log(`OK: correo enviado a ${f.email}`);
  await markFounderOnboardingSent(r.id);
  console.log(`OK: marcado onboarding_enviado_at en ${r.id}`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

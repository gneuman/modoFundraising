/**
 * Mini-loop para los 3 founders ligados a la postulacion Test de Nicole Macchiavello.
 * Manda el correo de onboarding a cada uno, los marca con onboarding_enviado_at,
 * y reporta. Espera 5s entre envios para no parecer batch.
 *
 * Uso: npx tsx scripts/send-onboarding-nico-test.ts [--dry-run]
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { markFounderOnboardingSent } from "@/lib/airtable";
import { sendOnboardingEmail } from "@/lib/email-engine";
import Airtable from "airtable";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
const PORTAL_URL = `${APP_URL}/portal`;
// Orden definido por Gabriel: David primero, luego neumang@gmail.com (Gabriel), luego Nicole.
const NICO_TEST_IDS = [
  "recu5k2irwRmElOeu", // David Alvo
  "recBmSJYoWsk3SgyT", // Gabriel Neuman (neumang@gmail.com)
  "recMVLn7MdW1k6n8u", // Nicole Macchiavello
];

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

function sleep(ms: number) { return new Promise((res) => setTimeout(res, ms)); }

async function main() {
  const dry = process.argv.includes("--dry-run");
  console.log(`[nico-test] portal_url=${PORTAL_URL} dry=${dry}\n`);

  let enviados = 0;
  let errores = 0;
  for (const id of NICO_TEST_IDS) {
    const r = await base("Founders MF26").find(id).catch(() => null);
    if (!r) { console.log(`  ${id}: NO encontrado, salto`); continue; }
    const f = r.fields as any;
    const email = f.email as string;
    const firstName = (f.first_name as string) || "founder";
    const yaEnviado = !!f.onboarding_enviado_at;

    const tag = yaEnviado ? " [YA TENIA onboarding_enviado_at, lo voy a remandar y resobreescribir]" : "";
    console.log(`-> ${email} | ${firstName}${tag}`);

    if (dry) {
      console.log(`   DRY-RUN: no envio`);
      continue;
    }

    try {
      await sendOnboardingEmail(email, firstName, PORTAL_URL);
      await markFounderOnboardingSent(id);
      enviados++;
      console.log(`   OK enviado y marcado.`);
    } catch (e) {
      errores++;
      console.error(`   ERROR: ${e instanceof Error ? e.message : e}`);
    }

    // 5s entre envios
    await sleep(5000);
  }

  console.log(`\n[nico-test] resumen: enviados=${enviados} errores=${errores}`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

/**
 * Loop de onboarding: agarra al proximo founder pendiente, le manda el correo,
 * lo marca, espera N segundos, repite. Termina cuando no quedan pendientes.
 *
 * Uso:
 *   npx tsx scripts/send-onboarding-loop.ts                 # 60s entre envios (default)
 *   npx tsx scripts/send-onboarding-loop.ts --interval=30   # 30s entre envios
 *   npx tsx scripts/send-onboarding-loop.ts --max=10        # corta a los 10 envios
 *   npx tsx scripts/send-onboarding-loop.ts --dry-run       # no envia ni marca
 *
 * Pausar: Ctrl+C. Re-correr: agarra desde el siguiente pendiente automaticamente.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getNextFounderForOnboarding, markFounderOnboardingSent } from "@/lib/airtable";
import { sendOnboardingEmail } from "@/lib/email-engine";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
const PORTAL_URL = `${APP_URL}/portal`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "gnb@teknobuilding.com";

function parseArgs() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const intervalArg = args.find((a) => a.startsWith("--interval="));
  const maxArg = args.find((a) => a.startsWith("--max="));
  const interval = intervalArg ? Math.max(1, parseInt(intervalArg.slice("--interval=".length), 10) || 60) : 60;
  const max = maxArg ? Math.max(1, parseInt(maxArg.slice("--max=".length), 10) || 0) : Infinity;
  return { dry, interval, max };
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function main() {
  const { dry, interval, max } = parseArgs();
  console.log(`[loop] interval=${interval}s max=${max === Infinity ? "Infinito" : max} dry=${dry}`);
  console.log(`[loop] portal_url=${PORTAL_URL}`);
  console.log(`[loop] admin excluido=${ADMIN_EMAIL}`);
  console.log("[loop] Ctrl+C para pausar. Re-correr retoma desde el siguiente pendiente.\n");

  let enviados = 0;
  let errores = 0;

  while (enviados < max) {
    const next = await getNextFounderForOnboarding({ excludeEmails: [ADMIN_EMAIL] });
    if (!next) {
      console.log("[loop] OK: no quedan founders pendientes. Termino.");
      break;
    }

    const ahora = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
    console.log(`[${ahora}] #${enviados + 1} -> ${next.email} | ${next.first_name} | quedan ${next.pendientes} (incl. este)`);

    if (dry) {
      console.log(`  DRY-RUN: no envio, no marco.`);
      enviados++;
    } else {
      try {
        await sendOnboardingEmail(next.email, next.first_name || "founder", PORTAL_URL);
        await markFounderOnboardingSent(next.id);
        console.log(`  OK enviado y marcado.`);
        enviados++;
      } catch (e) {
        errores++;
        console.error(`  ERROR (no marco para reintentar): ${e instanceof Error ? e.message : e}`);
        // Si falla, igual esperamos antes de reintentar para no martillar.
      }
    }

    if (enviados >= max) {
      console.log(`[loop] llegamos al max=${max}. Termino.`);
      break;
    }

    // Antes de chequear si quedan, esperamos. Asi mantenemos ritmo constante.
    console.log(`  durmiendo ${interval}s...\n`);
    await sleep(interval * 1000);
  }

  console.log(`\n[loop] resumen: enviados=${enviados} errores=${errores}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

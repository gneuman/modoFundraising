/**
 * Manda el correo de onboarding al PROXIMO founder pendiente y lo marca.
 * - Pendiente = portal_access=1 AND onboarding_enviado_at vacio.
 * - Excluye al admin (env ADMIN_EMAIL) si esta definido.
 * - Idempotente: si no quedan, no hace nada.
 *
 * Uso:
 *   npx tsx scripts/send-onboarding-next.ts            # manda 1
 *   npx tsx scripts/send-onboarding-next.ts --dry-run  # solo dice quien va
 *   npx tsx scripts/send-onboarding-next.ts --email=foo@bar.com  # fuerza email
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
  const emailArg = args.find((a) => a.startsWith("--email="));
  const email = emailArg ? emailArg.slice("--email=".length) : null;
  return { dry, email };
}

async function main() {
  const { dry, email: forced } = parseArgs();

  // Si pasaron --email, lo mandamos a ese (util para tests). Si no, al proximo pendiente.
  let target: { id?: string; email: string; first_name: string; pendientes: number } | null;
  if (forced) {
    // Buscar el founder por email; si no esta, mandamos con first_name="founder" y NO marcamos.
    target = { email: forced, first_name: "founder", pendientes: -1 };
    console.log(`[forced] target=${forced} (no se marcara onboarding_enviado_at porque no buscamos su record id)`);
  } else {
    const next = await getNextFounderForOnboarding({ excludeEmails: [ADMIN_EMAIL] });
    target = next;
  }

  if (!target) {
    console.log("OK: no quedan founders pendientes de onboarding. Nada que mandar.");
    return;
  }

  const pendientesMsg = target.pendientes >= 0 ? ` (${target.pendientes} pendientes, este incluido)` : "";
  console.log(`-> proximo: ${target.email} | ${target.first_name}${pendientesMsg}`);
  console.log(`   portal_url: ${PORTAL_URL}`);

  if (dry) {
    console.log("DRY-RUN: no se manda nada, no se marca nada.");
    return;
  }

  await sendOnboardingEmail(target.email, target.first_name || "founder", PORTAL_URL);
  console.log(`OK: correo enviado a ${target.email}`);

  if (target.id) {
    await markFounderOnboardingSent(target.id);
    console.log(`OK: marcado onboarding_enviado_at en ${target.id}`);
  }

  const restantes = target.pendientes >= 0 ? Math.max(0, target.pendientes - 1) : "?";
  console.log(`Restantes: ${restantes}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

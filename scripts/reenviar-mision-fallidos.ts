/**
 * Reenvía el correo de una misión SOLO a una lista explícita de emails
 * (los que fallaron con "Too many concurrent requests for user" en el
 * fan-out original), de forma SERIAL con pausa entre envíos para no volver
 * a chocar con el rate limit de Gmail.
 *
 * NO re-spamea a los founders que sí recibieron: solo manda a los emails
 * que le pases. NO toca notif_enviada_at ni el status de la misión.
 *
 * Uso:
 *   # emails en un archivo (uno por línea):
 *   npx tsx scripts/reenviar-mision-fallidos.ts <recordId> --file=scripts/fallidos.txt
 *
 *   # emails inline separados por coma:
 *   npx tsx scripts/reenviar-mision-fallidos.ts <recordId> --emails=a@x.com,b@y.com
 *
 *   # opcionales:
 *   --sleep=3000     ms entre envíos (default 3000)
 *   --dry-run        no envía, solo lista a quién mandaría
 *
 * Ejemplo real (Misión 2: Techstack):
 *   npx tsx scripts/reenviar-mision-fallidos.ts recqr2SmSAyTxJ6Os --file=scripts/fallidos.txt
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as fs from "node:fs";
import { getMisionByIdFresh, getAllFoundersWithAccess } from "@/lib/airtable";
import { sendMisionActivadaEmail } from "@/lib/email-engine";

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com"
).replace(/\/$/, "");
const PORTAL_URL = `${APP_URL}/portal/misiones`;

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const recordId = args.find((a) => !a.startsWith("--"))?.trim();
  const fileArg = args.find((a) => a.startsWith("--file="));
  const emailsArg = args.find((a) => a.startsWith("--emails="));
  const sleepArg = args.find((a) => a.startsWith("--sleep="));
  const dry = args.includes("--dry-run");

  let emails: string[] = [];
  if (fileArg) {
    const path = fileArg.slice("--file=".length);
    emails = fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  } else if (emailsArg) {
    emails = emailsArg
      .slice("--emails=".length)
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  }

  // Normaliza + dedup (case-insensitive).
  const seen = new Set<string>();
  emails = emails.filter((e) => {
    const k = e.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const sleepMs = sleepArg
    ? Math.max(0, parseInt(sleepArg.slice("--sleep=".length), 10) || 3000)
    : 3000;

  return { recordId, emails, sleepMs, dry };
}

async function main() {
  const { recordId, emails, sleepMs, dry } = parseArgs();

  if (!recordId) {
    console.error("Falta <recordId>. Uso: npx tsx scripts/reenviar-mision-fallidos.ts <recordId> --file=scripts/fallidos.txt");
    process.exit(1);
  }
  if (emails.length === 0) {
    console.error("No hay emails. Pasa --file=<archivo> (uno por línea) o --emails=a@x.com,b@y.com");
    process.exit(1);
  }

  const mision = await getMisionByIdFresh(recordId);
  if (!mision) {
    console.error(`Misión ${recordId} no encontrada.`);
    process.exit(1);
  }
  if (!mision.titulo) {
    console.error(`Misión ${recordId} sin título — abortando.`);
    process.exit(1);
  }

  // Resolver first_name de cada email desde el cohort (mismo que usa el route).
  const founders = await getAllFoundersWithAccess();
  const byEmail = new Map(founders.map((f) => [f.email.toLowerCase(), f]));

  console.log(`Misión: ${mision.titulo} (${recordId})`);
  console.log(`Destinatarios: ${emails.length} | sleep=${sleepMs}ms | dry=${dry}\n`);

  let ok = 0;
  const errores: { email: string; error: string }[] = [];

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const founder = byEmail.get(email.toLowerCase());
    const firstName = founder?.first_name || "founder";
    const tieneAcceso = Boolean(founder);
    const marca = tieneAcceso ? "" : "  ⚠ no está en founders con acceso (mando igual con nombre genérico)";

    console.log(`#${i + 1}/${emails.length} -> ${email} | ${firstName}${marca}`);

    if (dry) {
      console.log("  DRY-RUN: no envío.");
    } else {
      try {
        await sendMisionActivadaEmail(email, firstName, mision, PORTAL_URL);
        console.log("  OK enviado.");
        ok++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  ERROR: ${msg}`);
        errores.push({ email, error: msg });
      }
    }

    if (i < emails.length - 1) {
      await sleep(sleepMs);
    }
  }

  console.log(`\nResumen: enviados=${ok} fallidos=${errores.length} total=${emails.length}`);
  if (errores.length) {
    console.log("Fallidos (reintentar con estos en el archivo):");
    errores.forEach((e) => console.log(`  ${e.email} — ${e.error}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("ERROR fatal:", e);
  process.exit(1);
});

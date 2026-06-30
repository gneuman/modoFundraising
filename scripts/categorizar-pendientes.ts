/**
 * Para los 14 founders PENDIENTES (sin onboarding_enviado_at), determinar:
 * - ¿Son titulares (postulación original)?
 * - ¿Son cofounders agregados desde el portal (/equipo/invitar)?
 * - ¿Cuándo se crearon? ¿Tienen joined_at?
 * - ¿La startup tiene payment_status pagado?
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT! }).base(process.env.AIRTABLE_BASE_ID!);

const PENDIENTES = [
  "francisco@fintezia.com",
  "juan@qleeko.com",
  "jsanchez@idrules.ai",
  "marco@aventiasolutions.com",
  "ascattolini@biocle.tech",
  "diego@ciudata.io",
  "leandro@antuenergia.cl",
  "dalbanesi@biocle.tech",
  "matias.padilla@retailcloudplan.com",
  "angie@diderot.art",
  "mayra.garcia3199@gmail.com",
  "brissia@ciudata.io",
  "antonio@antuenergia.cl",
  "ndrault@leaf-si.com",
];

async function main() {
  const founders = await base("Founders MF26").select().all();
  const postulaciones = await base("Postulaciones MF26").select().all();

  for (const email of PENDIENTES) {
    const f = founders.find((r) => ((r.fields as Record<string, unknown>).email as string)?.toLowerCase() === email);
    if (!f) {
      console.log(`\n${email} — NO encontrado en Founders MF26`);
      continue;
    }
    const ff = f.fields as Record<string, unknown>;
    const postLinks = (ff["Postulaciones MF26"] as string[]) ?? [];
    const post = postulaciones.find((p) => postLinks.includes(p.id));
    const pf = post ? (post.fields as Record<string, unknown>) : {};

    // Es titular si esta es la postulación original y el founder_record principal
    const founderRecords = (pf.founder_record as string[]) ?? [];
    const esTitular = founderRecords[0] === f.id;

    console.log(`\n${email}`);
    console.log(`  nombre: ${ff.first_name} ${ff.last_name}`);
    console.log(`  joined_at (cofounder agregado por portal): ${ff.joined_at ?? "—"}`);
    console.log(`  portal_access: ${ff.portal_access}`);
    console.log(`  Postulación: ${post?.id ?? "—"} | status=${pf.status ?? "?"} | payment=${pf.payment_status ?? "?"}`);
    console.log(`  Es titular: ${esTitular ? "SÍ" : "NO (es cofounder)"}`);
    console.log(`  invitado_calendar_at: ${ff.invitado_calendar_at ?? "—"}`);
    console.log(`  Último Ingreso Portal: ${ff["Último Ingreso Portal"] ?? "—"}`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

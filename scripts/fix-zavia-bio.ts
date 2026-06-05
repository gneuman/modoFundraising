/**
 * Setea total_cuotas=1 en Zavia Bio para que el diagnóstico de Recuperar
 * pagos la marque como "completado" y desaparezca de la tabla.
 *
 * Pagó US$837.60 en un solo cobro (pago único), pero la postulación tenía
 * total_cuotas=undefined → el código asumía 3 cuotas y calculaba 1/3.
 *
 * Uso: npx tsx scripts/fix-zavia-bio.ts          (dry-run)
 *      npx tsx scripts/fix-zavia-bio.ts --apply  (escribe)
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import Airtable from "airtable";

const PAT = process.env.AIRTABLE_PAT!;
const BASE = process.env.AIRTABLE_BASE_ID!;
const APPLY = process.argv.includes("--apply");
const ZAVIA_ID = "recRLtONOfKTVaUC6";

async function main() {
  const base = new Airtable({ apiKey: PAT }).base(BASE);
  const r = await base("Postulaciones MF26").find(ZAVIA_ID);
  const f = r.fields as Record<string, unknown>;

  console.log(`\nZavia Bio (${ZAVIA_ID})`);
  console.log(`  status:         ${f.status}`);
  console.log(`  payment_status: ${f.payment_status}`);
  console.log(`  total_cuotas:   ${f.total_cuotas ?? "(vacío)"}`);

  if (f.total_cuotas === 1) {
    console.log("\n✅ Ya tiene total_cuotas=1. Nada que hacer.");
    return;
  }

  if (!APPLY) {
    console.log(`\nDRY-RUN — setearía total_cuotas=1. Correr con --apply para escribir.\n`);
    return;
  }

  await base("Postulaciones MF26").update(ZAVIA_ID, { total_cuotas: 1 } as never, { typecast: true });
  console.log(`\n✅ total_cuotas=1 escrito en Airtable.`);
  console.log(`   En la próxima carga de /admin/revenue, Zavia Bio cae en "completado" y desaparece de la tabla.`);
}

main().catch((err) => { console.error("ERROR:", err); process.exit(1); });

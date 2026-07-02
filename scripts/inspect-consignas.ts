/**
 * Inspecciona los records de Consignas MF26 para debuggear el fetch
 * de consignas existentes por startup.
 *
 * Uso: npx tsx scripts/inspect-consignas.ts
 * Opcional: npx tsx scripts/inspect-consignas.ts <startupId>
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

const TBL_CONSIGNAS = "tbliTlMl0dfbh3HWc";
const TBL_STARTUPS = "tblEuAAiHOZlEnbrN"; // dummy — se resuelve por nombre abajo si falla

async function main() {
  const targetStartupId = process.argv[2];

  console.log(`\n=== Todas las consignas en Airtable ===\n`);
  const all = await base(TBL_CONSIGNAS).select().all();
  console.log(`Total records: ${all.length}\n`);

  for (const r of all) {
    const f = r.fields as Record<string, unknown>;
    console.log("─".repeat(80));
    console.log(`Record id: ${r.id}`);
    console.log(`  Fields keys: ${Object.keys(f).join(", ")}`);
    for (const [k, v] of Object.entries(f)) {
      const val = typeof v === "string" && v.length > 100 ? v.slice(0, 100) + "..." : v;
      console.log(`  ${k}: ${JSON.stringify(val)}`);
    }
  }

  if (targetStartupId) {
    console.log(`\n=== Test del filtro FIND para startupId=${targetStartupId} ===\n`);
    const filtered = await base(TBL_CONSIGNAS)
      .select({
        filterByFormula: `FIND("${targetStartupId}", {id_consigna}) = 1`,
      })
      .all();
    console.log(`Records que matchean: ${filtered.length}`);
    for (const r of filtered) {
      const f = r.fields as Record<string, unknown>;
      console.log(`  ${r.id}: id_consigna="${f.id_consigna}"`);
    }
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

/**
 * Chequea si neumang@gmail.com esta como Founder con portal_access.
 * Uso para test end-to-end del flujo mision-activada.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";
const FOUNDERS_TABLE_ID = "tblTif15ehnRN4K74";
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  const records = await base(FOUNDERS_TABLE_ID)
    .select({
      filterByFormula: `OR(LOWER({email}) = "neumang@gmail.com", LOWER({email}) = "neumang+mf@gmail.com")`,
      fields: ["email", "first_name", "last_name", "portal_access", "Startups MF26"],
    })
    .all();

  console.log(`\nFounders con email neumang@gmail.com: ${records.length}\n`);
  for (const r of records) {
    const f = r.fields as any;
    console.log(`▸ ${f.first_name} ${f.last_name} (${r.id})`);
    console.log(`  email: ${f.email}`);
    console.log(`  portal_access: ${f.portal_access ?? false}`);
    console.log(`  startups: ${JSON.stringify(f["Startups MF26"] ?? [])}`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

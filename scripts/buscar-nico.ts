import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  const recs = await base("Founders MF26")
    .select({
      filterByFormula: `OR(SEARCH("nico", LOWER({first_name})), SEARCH("nico", LOWER({email})), SEARCH("test", LOWER({first_name})), SEARCH("test", LOWER({last_name})), SEARCH("test", LOWER({email})))`,
      fields: ["email", "first_name", "last_name", "portal_access", "onboarding_enviado_at"],
    })
    .all();

  console.log(`Matches: ${recs.length}\n`);
  for (const r of recs) {
    const f = r.fields as any;
    console.log(`  ${r.id} | ${f.email} | ${f.first_name} ${f.last_name ?? ""} | portal_access=${f.portal_access === true} | onboarding_enviado_at=${f.onboarding_enviado_at ?? "(vacio)"}`);
  }
}
main().catch(console.error);

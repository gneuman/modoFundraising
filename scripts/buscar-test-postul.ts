import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  // Postulaciones marcadas como test=true
  const testPosts = await base("Postulaciones MF26")
    .select({ filterByFormula: `{Test} = 1` })
    .all();
  console.log(`Postulaciones con Test=true: ${testPosts.length}`);
  for (const p of testPosts) {
    const f = p.fields as any;
    const firstName = (f["first_name (from founder_record)"] as string[])?.[0] ?? "?";
    const lastName = (f["last_name (from founder_record)"] as string[])?.[0] ?? "?";
    const email = (f["email (from founder_record)"] as string[])?.[0] ?? "?";
    const portalAccess = (f["portal_access (from founder_record)"] as boolean[])?.[0] ?? false;
    console.log(`  ${p.id} | ${email} | ${firstName} ${lastName} | status=${f.status} | portal_access(lookup)=${portalAccess}`);
    console.log(`    founder_record=${JSON.stringify(f.founder_record)}`);
  }
}
main().catch(console.error);

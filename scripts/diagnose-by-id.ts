import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function testTable(idOrName: string, label: string) {
  try {
    const recs = await base(idOrName).select({ maxRecords: 1 }).firstPage();
    console.log(`OK   ${label} (${idOrName}): ${recs.length} record sample`);
    if (recs[0]) console.log(`     fields sample: ${Object.keys(recs[0].fields).slice(0, 8).join(", ")}`);
  } catch (e: any) {
    console.log(`FAIL ${label} (${idOrName}): ${e.statusCode} ${e.error}`);
  }
}

async function main() {
  await testTable("tblqj2eJMHpEqLxqv", "Postulaciones (by id)");
  await testTable("tblHRJ35xMM3rQa85", "Clases (by id)");
  await testTable("tblTif15ehnRN4K74", "Founders MF26 (by id)");
}
main().catch(console.error);

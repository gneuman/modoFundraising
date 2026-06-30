import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

const TABLES = [
  "Founders MF26",
  "Postulaciones MF26",
  "Startups MF26",
  "Clases MF26",
  "Pagos MF26",
];

async function main() {
  for (const t of TABLES) {
    try {
      const recs = await base(t).select({ maxRecords: 1 }).firstPage();
      console.log(`OK  ${t}: ${recs.length} record sample`);
    } catch (e: any) {
      console.log(`FAIL ${t}: ${e.statusCode} ${e.error} ${e.message}`);
    }
  }

  // Meta API
  try {
    const r = await fetch(`https://api.airtable.com/v0/meta/bases/${process.env.AIRTABLE_BASE_ID}/tables`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` },
    });
    if (r.ok) {
      const data = await r.json() as { tables: { id: string; name: string }[] };
      console.log(`\nMeta OK. Tablas visibles: ${data.tables.map((t) => t.name).join(", ")}`);
    } else {
      console.log(`\nMeta FAIL: ${r.status} ${await r.text()}`);
    }
  } catch (e) {
    console.log(`Meta error: ${e}`);
  }
}
main().catch(console.error);

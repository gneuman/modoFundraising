import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

async function main() {
  const url = `https://api.airtable.com/v0/${BASE_ID}/tbliTlMl0dfbh3HWc?maxRecords=20`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${PAT}` } });
  console.log(`Status: ${r.status}`);
  const d = await r.json();
  console.log(`Total records: ${(d.records ?? []).length}\n`);
  for (const rec of (d.records ?? [])) {
    console.log(`ID: ${rec.id}`);
    console.log(`  startup_record: ${JSON.stringify(rec.fields.startup_record ?? [])}`);
    console.log(`  tarea: ${JSON.stringify(rec.fields.tarea ?? [])}`);
    console.log(`  contenido_texto: ${(rec.fields.contenido_texto ?? "").slice(0, 60)}`);
    console.log(`  id_consigna: ${rec.fields.id_consigna}`);
    console.log("");
  }
}
main().catch(console.error);

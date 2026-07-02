import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

async function main() {
  const idConsigna = "recUAe9bkyV03eIWH-recnDnyC4cxyLkiMe";
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/tbliTlMl0dfbh3HWc`);
  url.searchParams.set("filterByFormula", `{id_consigna} = "${idConsigna}"`);
  url.searchParams.set("maxRecords", "5");
  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${PAT}` } });
  const d = await r.json();
  console.log(`Query: {id_consigna} = "${idConsigna}"`);
  console.log(`Records encontrados: ${(d.records ?? []).length}`);
  for (const rec of (d.records ?? [])) {
    console.log(`  ${rec.id} | ${rec.fields.contenido_texto}`);
  }

  // Test getConsignasByStartup
  const startupId = "recUAe9bkyV03eIWH";
  const url2 = new URL(`https://api.airtable.com/v0/${BASE_ID}/tbliTlMl0dfbh3HWc`);
  url2.searchParams.set("filterByFormula", `FIND("${startupId}", {id_consigna}) = 1`);
  const r2 = await fetch(url2.toString(), { headers: { Authorization: `Bearer ${PAT}` } });
  const d2 = await r2.json();
  console.log(`\nQuery: FIND("${startupId}", {id_consigna}) = 1`);
  console.log(`Records encontrados: ${(d2.records ?? []).length}`);
  for (const rec of (d2.records ?? [])) {
    console.log(`  ${rec.id} | ${rec.fields.id_consigna}`);
  }
}
main().catch(console.error);

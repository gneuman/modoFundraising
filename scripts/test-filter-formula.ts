import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

async function testFormula(formula: string, desc: string) {
  console.log(`\n=== ${desc} ===`);
  console.log(`Formula: ${formula}`);
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/tbliTlMl0dfbh3HWc`);
  url.searchParams.set("filterByFormula", formula);
  url.searchParams.set("maxRecords", "5");
  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${PAT}` } });
  console.log(`Status: ${r.status}`);
  const body = await r.text();
  try {
    const d = JSON.parse(body);
    console.log(`Records: ${(d.records ?? []).length}`);
    for (const rec of (d.records ?? [])) {
      console.log(`  ${rec.id} | startup_record=${JSON.stringify(rec.fields.startup_record)} | tarea=${JSON.stringify(rec.fields.tarea)}`);
    }
  } catch {
    console.log(`Body: ${body.slice(0, 200)}`);
  }
}

async function main() {
  await testFormula(
    `AND(SEARCH("recUAe9bkyV03eIWH", ARRAYJOIN({startup_record})), SEARCH("recnDnyC4cxyLkiMe", ARRAYJOIN({tarea})))`,
    "Filtro que usa el código actual (con {startup_record} y {tarea})",
  );

  // Airtable a veces requiere backticks alrededor del field name si tiene caracteres especiales
  await testFormula(
    `SEARCH("recUAe9bkyV03eIWH", ARRAYJOIN({startup_record}))`,
    "Solo por startup_record",
  );

  await testFormula(
    `SEARCH("recnDnyC4cxyLkiMe", ARRAYJOIN({tarea}))`,
    "Solo por tarea",
  );

  // A veces filterByFormula falla en fields multipleRecordLinks. Usar el field lookup.
  await testFormula(
    `FIND("recUAe9bkyV03eIWH", ARRAYJOIN({startup_record}))`,
    "FIND en vez de SEARCH",
  );
}
main().catch(console.error);

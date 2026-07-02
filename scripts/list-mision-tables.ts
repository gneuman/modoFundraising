import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

async function main() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const d = await res.json();
  console.log("\nTablas relevantes:");
  for (const t of (d.tables ?? [])) {
    if (/mision|tarea|consigna|clase/i.test(t.name)) {
      console.log(`  ${t.id}  ${t.name}`);
    }
  }
  console.log("\nBuscando tarea recnDnyC4cxyLkiMe en TODAS las tablas...");
  for (const t of (d.tables ?? [])) {
    const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${t.id}/recnDnyC4cxyLkiMe`, {
      headers: { Authorization: `Bearer ${PAT}` },
    });
    if (r.ok) {
      console.log(`  ✅ FOUND en ${t.id} (${t.name})`);
      const data = await r.json();
      console.log(`     Fields keys: ${Object.keys(data.fields).join(", ")}`);
      console.log(`     tipo: ${data.fields.tipo}`);
      console.log(`     titulo: ${data.fields.titulo}`);
      console.log(`     mision: ${JSON.stringify(data.fields.mision)}`);
    }
  }
}
main().catch(console.error);

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

async function main() {
  // Listar todas las tablas y buscar records cuyo nombre contenga "Modo Foco"
  const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const meta = await metaRes.json();
  for (const t of meta.tables ?? []) {
    // Buscar en tablas que probablemente tengan startups
    if (!/startup|postulacion|founder/i.test(t.name)) continue;
    console.log(`\n=== Buscando en ${t.name} (${t.id}) ===`);
    // Usar filterByFormula generico buscando el string
    const url = `https://api.airtable.com/v0/${BASE_ID}/${t.id}?maxRecords=100`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${PAT}` } });
    if (!r.ok) { console.log(`  status ${r.status}`); continue; }
    const d = await r.json();
    const matches = (d.records ?? []).filter((rec: any) => {
      const values = JSON.stringify(rec.fields);
      return /Modo Foco|modofoco/i.test(values);
    });
    for (const m of matches) {
      console.log(`  ${m.id} | keys=${Object.keys(m.fields).slice(0,5).join(",")}`);
      const nombre = m.fields.startup_name ?? m.fields.name ?? m.fields.titulo ?? "?";
      console.log(`    nombre: ${nombre}`);
    }
  }
}
main().catch(console.error);

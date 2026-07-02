import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

async function main() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const data = await res.json();

  // Buscar qué tabla usa cada uno de estos linkedTableIds
  const linkTargets = new Set<string>();

  const check = ["Asistencias MF26", "Misiones Completadas MF26", "Feedback MF26", "Consignas MF26"];
  for (const name of check) {
    const t = data.tables.find((x: any) => x.name === name);
    if (!t) { console.log(`${name}: NO EXISTE`); continue; }
    console.log(`\n=== ${name} (${t.id}) ===`);
    for (const f of t.fields) {
      if (f.type === "multipleRecordLinks") {
        const linked = data.tables.find((x: any) => x.id === f.options.linkedTableId);
        console.log(`  ${f.name} → ${f.options.linkedTableId} (${linked?.name ?? "???"})`);
        linkTargets.add(f.options.linkedTableId);
      }
    }
  }

  // Mostrar ambas tablas Startups
  console.log("\n\n=== Todas las tablas con nombre 'Startup' ===");
  for (const t of data.tables) {
    if (t.name.toLowerCase().includes("startup")) {
      console.log(`  ${t.id}  ${t.name}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

async function main() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const data = await res.json();
  const consignas = data.tables.find((t: any) => t.id === "tbliTlMl0dfbh3HWc");
  if (!consignas) {
    console.error("No encontré Consignas MF26");
    process.exit(1);
  }
  console.log(`\n=== Consignas MF26 (${consignas.id}) ===`);
  console.log(`Nombre exacto: "${consignas.name}"`);
  for (const f of consignas.fields) {
    console.log(`  [${f.type}] "${f.name}"`);
  }
}
main().catch(console.error);

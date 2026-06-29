import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  const all = await base("Postulaciones MF26").select({ fields: ["status"] }).all();
  const counts: Record<string, number> = {};
  for (const r of all) {
    const s = (r.fields as any).status ?? "(vacio)";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  console.log(`Total postulaciones: ${all.length}`);
  console.log("Por status:");
  for (const [s, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s}: ${n}`);
  }
}
main().catch(console.error);

/**
 * Lista todas las tablas del base con su id y nombre actual via Meta API.
 * Sirve para mapear los nombres del codigo a tableIds estables.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

async function main() {
  const r = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const data = (await r.json()) as { tables: { id: string; name: string }[] };
  console.log(`Total tablas: ${data.tables.length}\n`);
  console.log("id                       | nombre actual");
  console.log("-".repeat(80));
  for (const t of data.tables.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`${t.id.padEnd(24)} | ${t.name}`);
  }
}
main().catch(console.error);

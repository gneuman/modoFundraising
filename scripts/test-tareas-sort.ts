import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TAREAS = "tblbuljOsP9zSSMpn";

async function main() {
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TAREAS}`);
  url.searchParams.append("sort[0][field]", "orden");
  url.searchParams.append("sort[0][direction]", "asc");
  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${PAT}` } });
  const d = await r.json();
  console.log(`Total: ${d.records?.length ?? 0}`);
  for (const rec of (d.records ?? [])) {
    console.log(`  orden=${rec.fields.orden}, tipo=${rec.fields.tipo}, ${rec.fields.titulo}`);
  }
}
main().catch(console.error);

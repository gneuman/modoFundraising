import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TAREAS = "tblbuljOsP9zSSMpn";

const tareaId = process.argv[2];
if (!tareaId) { console.error("Uso: npx tsx scripts/check-tarea.ts <tareaId>"); process.exit(1); }

async function main() {
  const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TAREAS}/${tareaId}`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  if (!r.ok) { console.log(`Status: ${r.status}`); console.log(await r.text()); process.exit(1); }
  const d = await r.json();
  console.log(`Tarea ${d.id}`);
  console.log(`  tipo: ${d.fields.tipo}`);
  console.log(`  titulo: ${d.fields.titulo}`);
  console.log(`  orden: ${d.fields.orden}`);
  console.log(`  mision: ${JSON.stringify(d.fields.mision)}`);
  console.log(`  Consignas MF26 (lookup): ${JSON.stringify(d.fields["Consignas MF26"] ?? [])}`);
  console.log(`  fields keys: ${Object.keys(d.fields).join(", ")}`);
}
main().catch(console.error);

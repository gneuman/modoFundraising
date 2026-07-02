import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TAREAS = "tblbuljOsP9zSSMpn";

const tareaIds = ["rech12mDgO2pb35Ug","recnDnyC4cxyLkiMe","rec5rCBsVINdprdvt","recOU9lFrnsTfPWIV","recqSrVLBtJVQBa8Z"];

async function main() {
  for (const id of tareaIds) {
    const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TAREAS}/${id}`, {
      headers: { Authorization: `Bearer ${PAT}` },
    });
    if (!r.ok) {
      console.log(`❌ ${id}: ${r.status}`);
      continue;
    }
    const d = await r.json();
    const f = d.fields;
    console.log(`\n${id}`);
    console.log(`  tipo: ${f.tipo}`);
    console.log(`  titulo: ${f.titulo}`);
    console.log(`  orden: ${f.orden}`);
    console.log(`  mision: ${JSON.stringify(f.mision)}`);
    console.log(`  fields keys: ${Object.keys(f).join(", ")}`);
  }
}
main().catch(console.error);

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TAREAS = "tblbuljOsP9zSSMpn";
const MISIONES = "tbl0ySIkDEmBJWRsx";
const MISION_ID = "recddi5oQwT2nX7Sj";

async function main() {
  // 1. Ver la mision
  const misionRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${MISIONES}/${MISION_ID}`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const misionData = await misionRes.json();
  console.log("=== MISION ===");
  console.log(`ID: ${misionData.id}`);
  console.log(`Status: ${misionData.fields.status}`);
  console.log(`Titulo: ${misionData.fields.titulo}`);
  console.log(`Descripcion: ${(misionData.fields.descripcion ?? "").slice(0, 100)}`);
  console.log(`fields keys: ${Object.keys(misionData.fields).join(", ")}`);
  console.log(`notif_enviada_at: ${misionData.fields.notif_enviada_at}`);
  console.log(`clase: ${JSON.stringify(misionData.fields.clase)}`);
  console.log(`Tareas link (Tareas MF26): ${JSON.stringify(misionData.fields["Tareas MF26"] ?? [])}`);

  // 2. Listar tareas linkeadas a esta mision
  console.log("\n=== TAREAS DE ESTA MISION ===");
  const tareasRes = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TAREAS}?filterByFormula=${encodeURIComponent(`SEARCH("${MISION_ID}", ARRAYJOIN({mision}))`)}`,
    { headers: { Authorization: `Bearer ${PAT}` } },
  );
  const tareasData = await tareasRes.json();
  const tareas = tareasData.records ?? [];
  console.log(`Total tareas: ${tareas.length}`);
  for (const t of tareas) {
    console.log(`\n  ${t.id} | tipo=${t.fields.tipo}`);
    console.log(`  titulo: ${t.fields.titulo}`);
    console.log(`  descripcion: ${(t.fields.descripcion ?? "").slice(0, 80)}`);
    console.log(`  Consignas MF26 (lookup): ${JSON.stringify(t.fields["Consignas MF26"] ?? [])}`);
  }
}
main().catch(console.error);

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

async function main() {
  // 1. Bajar schema completo
  const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const meta = await metaRes.json();
  const allTables = meta.tables ?? [];
  console.log(`Total tablas en base: ${allTables.length}`);
  const tareaTables = allTables.filter((t: any) => /tarea/i.test(t.name));
  console.log(`\nTablas con "tarea" en el nombre:`);
  for (const t of tareaTables) {
    console.log(`  ${t.id}  ${t.name}`);
  }

  // 2. Ver todos los IDs de tablas del schema. Comparar con Tables constant.
  console.log(`\nTodos los IDs de tabla del schema:`);
  const schemaIds = new Set(allTables.map((t: any) => t.id));
  for (const id of ["tblbuljOsP9zSSMpn"]) {
    console.log(`  ${id}: ${schemaIds.has(id) ? "SI existe" : "NO EXISTE"}`);
  }

  // 3. Bajar el schema de Misiones MF26 para ver el nombre exacto del linked field
  const misionesTable = allTables.find((t: any) => t.name.includes("Misiones MF26"));
  if (misionesTable) {
    console.log(`\n=== Misiones MF26 (${misionesTable.id}) schema ===`);
    for (const f of misionesTable.fields ?? []) {
      if (f.type === "multipleRecordLinks") {
        console.log(`  ${f.name} → ${f.options?.linkedTableId}`);
      }
    }
  }

  // 4. Encontrar la tabla real con las tareas de la mision
  const misionId = "recddi5oQwT2nX7Sj";
  const tareaIds = ["rech12mDgO2pb35Ug","recnDnyC4cxyLkiMe","rec5rCBsVINdprdvt","recOU9lFrnsTfPWIV","recqSrVLBtJVQBa8Z"];
  console.log(`\nBuscando ${tareaIds[0]} en cada tabla:`);
  for (const t of allTables) {
    const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${t.id}/${tareaIds[0]}`, {
      headers: { Authorization: `Bearer ${PAT}` },
    });
    if (r.ok) {
      const d = await r.json();
      // Solo mostrar si tiene un campo "titulo" o "tipo" que sea de tarea
      if (d.fields?.tipo === "Entrega" || d.fields?.tipo === "NPS" || d.fields?.tipo === "Checklist") {
        console.log(`  ✅ ${t.id}  ${t.name} — LEGITIMO`);
        console.log(`     titulo: ${d.fields.titulo}`);
        console.log(`     tipo: ${d.fields.tipo}`);
        console.log(`     mision: ${JSON.stringify(d.fields.mision)}`);
      }
    }
  }
}
main().catch(console.error);

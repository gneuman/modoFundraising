/**
 * Inspecciona las vistas de Postulaciones MF26 para entender qué columnas
 * tiene visible la vista "Accepted" (o equivalente) y si los nuevos campos
 * follow_up_*_sent_visual están ocultos ahí.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE = process.env.AIRTABLE_BASE_ID!;
const TABLE_NAME = "Postulaciones MF26";

async function main() {
  const res = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE}/tables?include[]=visibleFieldIds`,
    { headers: { Authorization: `Bearer ${PAT}` } }
  );
  const meta = await res.json();
  const tabla = meta.tables.find((t: { name: string }) => t.name === TABLE_NAME);
  if (!tabla) { console.log(`No encontré ${TABLE_NAME}`); return; }

  const fieldsById = new Map<string, { name: string; type: string }>();
  for (const f of tabla.fields) fieldsById.set(f.id, { name: f.name, type: f.type });

  console.log(`Tabla: ${TABLE_NAME} (${tabla.id})`);
  console.log(`Total campos: ${tabla.fields.length}`);
  console.log(`Total vistas: ${tabla.views.length}\n`);

  for (const v of tabla.views) {
    console.log(`── Vista: "${v.name}" (${v.type}) ───────────────────`);
    if (!v.visibleFieldIds) {
      console.log("  (visibleFieldIds no disponible para esta vista)\n");
      continue;
    }
    const visibles = v.visibleFieldIds.map((id: string) => fieldsById.get(id)?.name ?? id);
    const ocultos = tabla.fields
      .filter((f: { id: string }) => !v.visibleFieldIds.includes(f.id))
      .map((f: { name: string }) => f.name);

    const interesa = ["follow_up_1_sent", "follow_up_1_sent_at", "follow_up_1_sent_visual",
                       "follow_up_2_sent", "follow_up_2_sent_at", "follow_up_2_sent_visual"];
    const status = interesa.map((n) => `${n}: ${visibles.includes(n) ? "VISIBLE" : "oculto"}`);
    console.log("  Campos follow-up:");
    for (const s of status) console.log(`    ${s}`);
    console.log(`  Total visibles: ${visibles.length} / ocultos: ${ocultos.length}\n`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * Limpia consignas duplicadas: agrupa por id_consigna y deja solo la más reciente
 * (por actualizada_at). Consolida contenido_texto/url_extra/adjuntos de la más
 * reciente y borra el resto.
 *
 * Uso: npx tsx scripts/cleanup-consignas-duplicadas.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const CONSIGNAS = "tbliTlMl0dfbh3HWc";

async function main() {
  console.log("Listando todas las consignas...");
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}?maxRecords=100`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const data = await res.json();
  const records = data.records ?? [];
  console.log(`Total: ${records.length}`);

  // Agrupar por id_consigna
  const groups = new Map<string, any[]>();
  for (const r of records) {
    const key = r.fields.id_consigna as string;
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const toDelete: string[] = [];
  for (const [key, group] of groups.entries()) {
    if (group.length <= 1) continue;
    console.log(`\nDuplicados para ${key}: ${group.length} records`);
    // Ordenar por actualizada_at desc (más reciente primero)
    group.sort((a, b) => {
      const aT = new Date(a.fields.actualizada_at ?? a.fields.enviada_at ?? 0).getTime();
      const bT = new Date(b.fields.actualizada_at ?? b.fields.enviada_at ?? 0).getTime();
      return bT - aT;
    });
    const [keeper, ...dups] = group;
    console.log(`  Manteniendo: ${keeper.id} (actualizada_at=${keeper.fields.actualizada_at})`);
    for (const d of dups) {
      console.log(`  Borrando: ${d.id} (actualizada_at=${d.fields.actualizada_at})`);
      toDelete.push(d.id);
    }
  }

  if (toDelete.length === 0) {
    console.log("\nNo hay duplicados. Nada que borrar.");
    return;
  }

  // Borrar en batches de 10 (limite de Airtable)
  console.log(`\nBorrando ${toDelete.length} records...`);
  for (let i = 0; i < toDelete.length; i += 10) {
    const batch = toDelete.slice(i, i + 10);
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}`);
    for (const id of batch) url.searchParams.append("records[]", id);
    const delRes = await fetch(url.toString(), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${PAT}` },
    });
    console.log(`  Batch ${i / 10 + 1}: status ${delRes.status}`);
  }
  console.log("\n✅ Limpieza completa");
}
main().catch(console.error);

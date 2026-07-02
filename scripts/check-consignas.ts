/**
 * Muestra todas las consignas guardadas para una startup.
 * Uso: npx tsx scripts/check-consignas.ts <startupRecordId>
 * Ejemplo: npx tsx scripts/check-consignas.ts recUAe9bkyV03eIWH
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const CONSIGNAS = "tbliTlMl0dfbh3HWc";

const startupId = process.argv[2];
if (!startupId) {
  console.error("Uso: npx tsx scripts/check-consignas.ts <startupRecordId>");
  process.exit(1);
}

async function main() {
  const formula = `SEARCH("${startupId}", ARRAYJOIN({startup_record}))`;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}?filterByFormula=${encodeURIComponent(formula)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${PAT}` } });
  const data = await res.json();
  const records = data.records ?? [];

  console.log(`\nConsignas para startup ${startupId}: ${records.length}\n`);
  for (const r of records) {
    const f = r.fields;
    console.log(`\n--- ${r.id} (${f.id_consigna}) ---`);
    console.log(`tarea:              ${JSON.stringify(f.tarea)}`);
    console.log(`contenido_texto:    ${(f.contenido_texto ?? "").slice(0, 100)}...`);
    console.log(`url_extra:          ${f.url_extra ?? "(vacio)"}`);
    console.log(`adjuntos:           ${Array.isArray(f.adjuntos) ? `${f.adjuntos.length} archivo(s)` : "(vacio)"}`);
    if (Array.isArray(f.adjuntos)) {
      for (const a of f.adjuntos) {
        console.log(`  - ${a.filename} (${a.type}, ${a.size} bytes) → ${a.url?.slice(0, 60)}...`);
      }
    }
    console.log(`enviada_at:         ${f.enviada_at}`);
    console.log(`actualizada_at:     ${f.actualizada_at}`);
    console.log(`founder_que_envio:  ${f.founder_que_envio}`);
    console.log(`startup_record:     ${JSON.stringify(f.startup_record)}`);
    console.log(`startup_deprecated: ${JSON.stringify(f.startup_deprecated_wrong_link ?? [])}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

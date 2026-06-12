/**
 * Lista las aplicaciones desde la base ImpactaOS-Academy+ que se usaron como
 * fuente para migrar startups al MF26.
 *
 * Base ID: appmKRVzbQavH6m2s
 * Tabla principal: "🎓 2. Academy Applications" (tblfL4vylaCZtVGyt) — 163 campos
 *
 * Uso: npx tsx scripts/listar-academy-plus.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";

const PAT = process.env.AIRTABLE_PAT!;
const ACADEMY_BASE_ID = "appmKRVzbQavH6m2s";
const APPS_TABLE_ID = "tblfL4vylaCZtVGyt";

const base = new Airtable({ apiKey: PAT }).base(ACADEMY_BASE_ID);

async function main() {
  console.log("Conectando a ImpactaOS-Academy+ → Academy Applications\n");

  // Pido todo y filtro en memoria para evitar errores de nombre de campo
  const records = await base(APPS_TABLE_ID).select().all();
  console.log(`Total registros: ${records.length}\n`);

  // Buscar las que migramos (IFSP26) — 8 startups del CSV
  const targetNames = [
    "Kawesqar Travels / Intelligence Hub",
    "PIXLAB CLASS",
    "Maity",
    "Zeii",
    "LEAF",
    "Aventia Solutions",
    "Finsphera",
    "Antu",
  ].map((n) => n.toLowerCase());

  // Buscar campo de nombre de startup
  if (records.length > 0) {
    const sampleFields = Object.keys(records[0].fields);
    console.log("Campos disponibles (primeros 30):");
    console.log(sampleFields.slice(0, 30).join(", "));
    console.log();
    const nameLikeFields = sampleFields.filter((f) =>
      /name|startup|company/i.test(f)
    );
    console.log("Campos tipo 'name/startup/company':");
    for (const f of nameLikeFields) console.log(`  - ${f}`);
    console.log();
  }

  // Detectar la columna del programa para agrupar
  const sample = records[0]?.fields as Record<string, unknown> | undefined;
  const programField = sample
    ? Object.keys(sample).find((k) => /program/i.test(k) && !/temp/i.test(k))
    : undefined;
  const startupField = sample
    ? Object.keys(sample).find((k) => /startup name/i.test(k))
    : undefined;

  console.log(`programField detectado: ${programField}`);
  console.log(`startupField detectado: ${startupField}\n`);

  if (programField) {
    const counts = new Map<string, number>();
    for (const r of records) {
      const v = (r.fields as Record<string, unknown>)[programField];
      const key = Array.isArray(v) ? v.join("|") : String(v ?? "(vacío)");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    console.log("Distribución por programa:");
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [k, n] of sorted) console.log(`  ${n.toString().padStart(4)} · ${k}`);
    console.log();
  }

  if (startupField) {
    const matched = records.filter((r) => {
      const name = String(
        (r.fields as Record<string, unknown>)[startupField] ?? ""
      ).toLowerCase();
      return targetNames.some((t) => name.includes(t) || t.includes(name));
    });
    console.log(`Coincidencias con CSV migrado (${targetNames.length} esperadas): ${matched.length}`);
    for (const m of matched) {
      const f = m.fields as Record<string, unknown>;
      console.log(`  → ${f[startupField]} | program=${f[programField ?? ""] ?? "—"}`);
    }
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

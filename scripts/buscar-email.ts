/**
 * Busca cualquier rastro de un email en Airtable:
 * - Founders (registro principal del founder)
 * - Postulaciones MF26 (denormaliza email del founder)
 * - Startups (por si quedó en algún campo)
 *
 * Uso: npx tsx scripts/buscar-email.ts jfalfaro@poasbioenergy.com
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const target = (process.argv[2] ?? "").toLowerCase().trim();

if (!target) {
  console.log("Uso: npx tsx scripts/buscar-email.ts <email>");
  process.exit(1);
}

const base = new Airtable({ apiKey: PAT }).base(BASE_ID);

async function main() {
  console.log(`Buscando rastro de: ${target}\n`);

  // 1. Founders
  console.log("── Founders ──────────────────────");
  const founders = await base("Founders MF26").select().all();
  const founderHits = founders.filter((r) => {
    const f = r.fields as Record<string, unknown>;
    return String(f.email ?? "").toLowerCase().includes(target);
  });
  console.log(`Total founders en base: ${founders.length}`);
  console.log(`Matches: ${founderHits.length}`);
  for (const f of founderHits) {
    console.log(`  → ${f.id}`);
    console.log(`    email: ${f.fields.email}`);
    console.log(`    first_name: ${f.fields.first_name}`);
    console.log(`    last_name: ${f.fields.last_name}`);
    console.log(`    created_at: ${f.fields.created_at ?? "—"}`);
    console.log(`    todos los campos:`, JSON.stringify(f.fields, null, 2));
  }

  // 2. Postulaciones MF26 — buscar por founder_record link
  console.log("\n── Postulaciones MF26 ──────────────");
  const postulaciones = await base("Postulaciones MF26").select().all();
  console.log(`Total postulaciones en base: ${postulaciones.length}`);
  const founderIds = new Set(founderHits.map((f) => f.id));
  const postHits = postulaciones.filter((p) => {
    const fields = p.fields as Record<string, unknown>;
    const founderLink = (fields.founder_record as string[]) ?? [];
    return founderLink.some((id) => founderIds.has(id));
  });
  console.log(`Matches por founder_record: ${postHits.length}`);
  for (const p of postHits) {
    console.log(`  → ${p.id}`);
    console.log(`    status: ${p.fields.status}`);
    console.log(`    created_at: ${p.fields.created_at ?? "—"}`);
    console.log(`    id_postulacion: ${p.fields.id_postulacion ?? "—"}`);
    console.log(`    startup_record: ${JSON.stringify(p.fields.startup_record ?? [])}`);
    console.log(`    todos los campos:`, JSON.stringify(p.fields, null, 2));
  }

  // 3. Startups — por si el email quedó en algún campo de startup
  console.log("\n── Startups ──────────────────────");
  const startups = await base("Startups MF26").select().all();
  const startupHits = startups.filter((s) => {
    const blob = JSON.stringify(s.fields).toLowerCase();
    return blob.includes(target);
  });
  console.log(`Total startups en base: ${startups.length}`);
  console.log(`Matches (búsqueda en todos los campos): ${startupHits.length}`);
  for (const s of startupHits) {
    console.log(`  → ${s.id} | ${s.fields.startup_name ?? "(sin nombre)"}`);
  }

  // 4. Resumen
  console.log("\n── Resumen ───────────────────────");
  if (founderHits.length === 0 && postHits.length === 0 && startupHits.length === 0) {
    console.log(`❌ No hay rastro de ${target} en ninguna tabla.`);
    console.log(`   Si alguna vez existió y se borró, ya no queda registro en Airtable`);
    console.log(`   (Airtable no guarda papelera vía API, solo en UI durante 7 días).`);
  } else {
    console.log(`✅ Encontrado:`);
    console.log(`   Founders: ${founderHits.length}`);
    console.log(`   Postulaciones: ${postHits.length}`);
    console.log(`   Startups: ${startupHits.length}`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

/**
 * Imprime las 26 clases con sus datos para revisar antes de recrear eventos.
 * Uso: npx tsx scripts/inspect-clases.ts
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

async function main() {
  const records = await base("Clases MF26")
    .select({ sort: [{ field: "fecha", direction: "asc" }] })
    .all();

  console.log(`Total clases: ${records.length}\n`);
  for (const r of records) {
    const f = r.fields as Record<string, unknown>;
    console.log("─".repeat(60));
    console.log(`id: ${r.id}`);
    console.log(`  titulo: ${f.titulo}`);
    console.log(`  fecha: ${f.fecha}`);
    console.log(`  semana: ${f.semana}`);
    console.log(`  calendar_event_id: ${f.calendar_event_id || "(vacío)"}`);
    console.log(`  meet_link: ${f.meet_link || "(vacío)"}`);
    console.log(`  url_live: ${f.url_live || "(vacío)"}`);
    const desc = f.descripcion as string | undefined;
    if (desc) console.log(`  descripcion: ${desc.slice(0, 80)}${desc.length > 80 ? "..." : ""}`);
  }
}

main().catch(console.error);

/**
 * Llena el campo `Clase` (numero) en la tabla "Clases MF26" extrayendo
 * el numero del prefijo del titulo. Ej: "S1 — ..." -> 1, "S13 - ..." -> 13.
 *
 * Idempotente: si el valor ya esta correcto, no escribe.
 * Uso: npx tsx scripts/backfill-clase-numero.ts
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

function extractClaseNumber(titulo: string): number | null {
  const match = titulo.match(/^S(\d+)\b/i);
  return match ? parseInt(match[1], 10) : null;
}

async function main() {
  const records = await base("Clases MF26")
    .select({ sort: [{ field: "fecha", direction: "asc" }] })
    .all();

  console.log(`Total clases: ${records.length}\n`);

  const updates: { id: string; fields: { Clase: number } }[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const r of records) {
    const f = r.fields as Record<string, unknown>;
    const titulo = (f.titulo as string) ?? "";
    const claseActual = f.Clase as number | undefined;
    const numero = extractClaseNumber(titulo);

    if (numero === null) {
      failed.push(`  ✗ ${titulo} — no se pudo extraer numero`);
      continue;
    }

    if (claseActual === numero) {
      skipped.push(`  · ${titulo} → Clase=${numero} (ya estaba)`);
      continue;
    }

    updates.push({ id: r.id, fields: { Clase: numero } });
    console.log(`  ✓ ${titulo} → Clase=${numero}${claseActual !== undefined ? ` (antes: ${claseActual})` : ""}`);
  }

  if (failed.length) {
    console.log("\nNo se pudo extraer numero de:");
    failed.forEach((l) => console.log(l));
  }

  console.log(`\nResumen: ${updates.length} a actualizar, ${skipped.length} ya correctos, ${failed.length} sin match`);

  if (!updates.length) {
    console.log("\nNada que actualizar.");
    return;
  }

  // Airtable acepta max 10 records por batch update
  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10);
    await base("Clases MF26").update(batch as never);
    console.log(`  Batch ${i / 10 + 1}: ${batch.length} actualizados`);
  }

  console.log("\nListo.");
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

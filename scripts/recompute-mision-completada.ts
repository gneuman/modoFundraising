/**
 * Ejecuta recomputeMisionCompletada manualmente para (startupId, misionId).
 * Sirve para reparar records de Misiones Completadas que no se generaron
 * (por ejemplo, tras el bug historico donde SEARCH+ARRAYJOIN devolvia 0
 * y la mision nunca quedaba marcada como completada).
 *
 * Uso: npx tsx scripts/recompute-mision-completada.ts <startupId> <misionId>
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

async function main() {
  const startupId = process.argv[2];
  const misionId = process.argv[3];
  if (!startupId || !misionId) {
    console.error("Uso: npx tsx scripts/recompute-mision-completada.ts <startupId> <misionId>");
    process.exit(1);
  }

  const { recomputeMisionCompletada } = await import("../src/lib/airtable");
  console.log(`Llamando recomputeMisionCompletada("${startupId}", "${misionId}")...`);
  const result = await recomputeMisionCompletada(startupId, misionId);
  console.log(`\nResultado:`);
  console.log(`  completada: ${result.completada}`);
  console.log(`  hechas: ${result.hechas}`);
  console.log(`  total: ${result.total}`);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

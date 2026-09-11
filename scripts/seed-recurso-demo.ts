/**
 * Semilla un recurso demo en la primera clase con semana definida.
 *
 * Motivación: si Airtable no tiene ningún recurso, showRecursos queda false
 * en el portal (layout.tsx) y el item "Recursos" no aparece en el sidebar,
 * ni la sección de recursos en el detalle de la clase. Con un recurso demo
 * podemos ver la UX de la feature.
 *
 * Idempotente: si ya existe un recurso con el mismo `titulo` en la clase
 * elegida, no crea otro. Correr las veces que quieras.
 *
 * Uso: npx tsx scripts/seed-recurso-demo.ts
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

// IDs de tabla (el PAT autoriza por ID, no por nombre — usar IDs = mas robusto)
const TBL_CLASES = "tblHRJ35xMM3rQa85";
const TBL_RECURSOS = "tblySmsPq0avXa4KS";

const RECURSO_TITULO = "Guía de fundraising — demo";
const RECURSO_URL = "https://www.ycombinator.com/library/4A-a-guide-to-seed-fundraising";
const RECURSO_TIPO = "Artículo";
const RECURSO_DESC = "Recurso de ejemplo para verificar que la sección Recursos se muestra en el portal.";

async function main() {
  // 1. Buscar la primera clase con semana definida (orden ascendente)
  const clases = await base(TBL_CLASES)
    .select({ sort: [{ field: "semana", direction: "asc" }] })
    .all();

  const claseTarget = clases.find((c) => {
    const semana = (c.fields as Record<string, unknown>).semana;
    return typeof semana === "number";
  });

  if (!claseTarget) {
    console.error("❌ No hay clases con semana definida. Aborto.");
    process.exit(1);
  }

  const claseFields = claseTarget.fields as Record<string, unknown>;
  console.log(`Clase elegida: [S${claseFields.semana}] ${claseFields.titulo}`);
  console.log(`  id: ${claseTarget.id}`);

  // 2. Chequear si ya existe un recurso con el mismo título asociado a esta clase
  const recursos = await base(TBL_RECURSOS).select().all();
  const existing = recursos.find((r) => {
    const f = r.fields as Record<string, unknown>;
    const clases = f.clase as string[] | undefined;
    return f.titulo === RECURSO_TITULO && clases?.includes(claseTarget.id);
  });

  if (existing) {
    console.log(`✅ Ya existe un recurso "${RECURSO_TITULO}" en esta clase (id: ${existing.id}). No hago nada.`);
    return;
  }

  // 3. Crear el recurso
  const created = await base(TBL_RECURSOS).create({
    titulo: RECURSO_TITULO,
    url: RECURSO_URL,
    tipo: RECURSO_TIPO,
    descripcion: RECURSO_DESC,
    clase: [claseTarget.id],
  } as never);

  console.log(`✅ Recurso creado (id: ${created.id})`);
  console.log(`   titulo: ${RECURSO_TITULO}`);
  console.log(`   url: ${RECURSO_URL}`);
  console.log(`   tipo: ${RECURSO_TIPO}`);
  console.log(`\nAhora el sidebar del portal debería mostrar "Recursos" y`);
  console.log(`el detalle de la clase debería mostrar la sección.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

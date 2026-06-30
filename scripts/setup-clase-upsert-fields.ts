/**
 * Crea los campos `listo_publicar` (checkbox) y `duracion_minutos` (number) en
 * la tabla `Clases MF26` via Airtable Meta API. Idempotente.
 *
 * Estos campos son consumidos por el endpoint POST /api/airtable/clase-upsert
 * (ver docs/setup-airtable-webhook-clases.md sección 7).
 *
 *   - listo_publicar: gate del webhook. Mientras esté desmarcado, el endpoint
 *     no toca Calendar. Permite editar título/fecha/descripción sin spamear
 *     "evento actualizado" a Founders.
 *   - duracion_minutos: override por clase. Default del endpoint = 90 si está
 *     vacío.
 *
 * Uso:
 *   npx tsx scripts/setup-clase-upsert-fields.ts         # dry run
 *   npx tsx scripts/setup-clase-upsert-fields.ts --apply # crea los campos
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
// Buscamos por tableId — el equipo renombra tablas a veces (agregan emoji)
// y el nombre obsoleto rompe el script en silencio. tableId es estable.
// Ver src/lib/airtable.ts → Tables.CLASES.
const CLASES_TABLE_ID = "tblHRJ35xMM3rQa85";
const APPLY = process.argv.includes("--apply");

const FIELDS = [
  {
    name: "listo_publicar",
    type: "checkbox",
    options: { icon: "check", color: "greenBright" },
    description:
      "Gate del webhook clase-upsert. Cuando se marca, dispara la Automation que crea/actualiza el evento de Google Calendar e invita a Founders activos. Desmarcado = draft, no toca Calendar.",
  },
  {
    name: "duracion_minutos",
    type: "number",
    options: { precision: 0 },
    description:
      "Duración de la clase en minutos. Usado por el webhook clase-upsert para calcular end.dateTime del evento. Vacío = 90 min (default).",
  },
];

async function main() {
  if (!PAT || !BASE_ID) {
    console.error("Falta AIRTABLE_PAT o AIRTABLE_BASE_ID en .env.local");
    process.exit(1);
  }

  const schemaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  if (!schemaRes.ok) {
    console.error("Meta API fail:", schemaRes.status, await schemaRes.text());
    process.exit(1);
  }

  const schema = (await schemaRes.json()) as {
    tables: { id: string; name: string; fields: { id: string; name: string; type: string }[] }[];
  };
  const table = schema.tables.find((t) => t.id === CLASES_TABLE_ID);
  if (!table) {
    console.error(`Tabla con id ${CLASES_TABLE_ID} no encontrada en base ${BASE_ID}`);
    process.exit(1);
  }
  console.log(`Tabla: ${table.name} (${table.id})\n`);

  for (const def of FIELDS) {
    const existing = table.fields.find((f) => f.name === def.name);
    console.log(`── ${def.name} (${def.type}) ──`);

    if (existing) {
      console.log(`  ✅ Ya existe (${existing.id}, type ${existing.type}). Skip.\n`);
      continue;
    }

    if (!APPLY) {
      console.log(`  DRY-RUN — body que enviaría:`);
      console.log(`  ${JSON.stringify(def)}\n`);
      continue;
    }

    const res = await fetch(
      `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${table.id}/fields`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
        body: JSON.stringify(def),
      }
    );
    if (!res.ok) {
      console.error(`  ❌ FAIL ${def.name}:`, res.status, await res.text(), "\n");
      continue;
    }
    const created = (await res.json()) as { id: string; name: string; type: string };
    console.log(`  ✅ Creado: ${created.name} (${created.id}, type ${created.type})\n`);
  }

  if (!APPLY) {
    console.log("\nDRY-RUN — corré con --apply para crear los campos.");
  } else {
    console.log("\nListo. Verificá en Airtable → Clases MF26 que aparezcan ambos campos.");
  }
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

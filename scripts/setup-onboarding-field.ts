/**
 * Crea el campo `onboarding_enviado_at` (tipo dateTime) en Founders MF26
 * usando la Airtable Meta API. Idempotente: si ya existe, no hace nada.
 *
 * Uso: npx tsx scripts/setup-onboarding-field.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const FIELD_NAME = "onboarding_enviado_at";
const TABLE_NAME = "Founders MF26";

async function main() {
  // 1. Encontrar el tableId de Founders MF26
  const schemaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  if (!schemaRes.ok) {
    console.error("ERROR leyendo schema:", schemaRes.status, await schemaRes.text());
    process.exit(1);
  }
  const schema = (await schemaRes.json()) as { tables: { id: string; name: string; fields: { id: string; name: string }[] }[] };
  const table = schema.tables.find((t) => t.name === TABLE_NAME);
  if (!table) {
    console.error(`Tabla "${TABLE_NAME}" no encontrada en el base.`);
    process.exit(1);
  }
  console.log(`Tabla encontrada: ${table.name} (${table.id})`);

  // 2. Chequear si ya existe
  const existing = table.fields.find((f) => f.name === FIELD_NAME);
  if (existing) {
    console.log(`OK ya existe: ${existing.name} (${existing.id}). No hago nada.`);
    return;
  }

  // 3. Crear el field
  const body = {
    name: FIELD_NAME,
    type: "dateTime",
    options: {
      dateFormat: { name: "iso" },
      timeFormat: { name: "24hour" },
      timeZone: "America/Mexico_City",
    },
    description: "Timestamp del envio masivo del correo de onboarding al portal. Vacio = aun no enviado.",
  };
  const createRes = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${table.id}/fields`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!createRes.ok) {
    console.error("ERROR creando field:", createRes.status, await createRes.text());
    process.exit(1);
  }
  const created = (await createRes.json()) as { id: string; name: string };
  console.log(`OK creado: ${created.name} (${created.id})`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

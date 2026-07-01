/**
 * Agrega la opcion "mision_activada" al singleSelect trigger_event de
 * Automation Rules MF26 (tblpcQ6EdiczQRbTI). Preserva TODAS las choices
 * existentes con sus ids (Airtable las identifica por id, no name).
 *
 * URL de la tabla: https://airtable.com/appGm9DW6WOKnDEAW/tblpcQ6EdiczQRbTI
 *
 * Uso: npx tsx scripts/add-choice-mision-activada.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = "tblpcQ6EdiczQRbTI";
const FIELD_ID = "fldym8vlkDEZM5dfM";
const NEW_CHOICE = "mision_activada";

async function main() {
  // 1) GET actual field
  const schemaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  if (!schemaRes.ok) throw new Error(`GET schema ${schemaRes.status} ${await schemaRes.text()}`);
  const schema = (await schemaRes.json()) as any;
  const table = schema.tables.find((t: any) => t.id === TABLE_ID);
  const field = table.fields.find((f: any) => f.id === FIELD_ID);
  const existing = field.options.choices as { id: string; name: string; color?: string }[];

  console.log(`Field: ${field.name} (${field.type})`);
  console.log(`Choices actuales: ${existing.length}`);

  if (existing.some((c) => c.name === NEW_CHOICE)) {
    console.log(`✅ Ya existe la choice "${NEW_CHOICE}". Nada que hacer.`);
    return;
  }

  // 2) Build PATCH body preserving ALL existing (con id) + la nueva sin id.
  const choices = [
    ...existing.map((c) => ({ id: c.id, name: c.name, ...(c.color ? { color: c.color } : {}) })),
    { name: NEW_CHOICE },
  ];

  // Prueba: mandar SIN color en las existentes (solo id + name).
  const choicesNoColor = [
    ...existing.map((c) => ({ id: c.id, name: c.name })),
    { name: NEW_CHOICE },
  ];
  const patchBody = { options: { choices: choicesNoColor } };
  console.log(`Intento sin color en choices existentes.`);
  console.log(`\nPATCH body preview:`);
  console.log(`  Preserva ${existing.length} choices con id`);
  console.log(`  Agrega 1 choice nueva: "${NEW_CHOICE}"`);
  console.log(`  Total post-PATCH: ${choices.length}\n`);

  // 3) PATCH
  const patchRes = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields/${FIELD_ID}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    },
  );

  console.log(`PATCH status: ${patchRes.status}`);
  const body = await patchRes.text();
  console.log(`PATCH response: ${body}\n`);

  if (!patchRes.ok) {
    console.error(`❌ Fallo el PATCH. Posibles causas:`);
    console.error(`   - PAT sin scope schema.bases:write`);
    console.error(`   - PAT sin permiso de editor sobre la base`);
    console.error(`   - Feature flag necesario para modificar choices`);
    process.exit(1);
  }

  console.log(`✅ Choice "${NEW_CHOICE}" agregada correctamente.`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

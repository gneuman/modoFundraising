/**
 * Crea un campo formula "form_reminder_sent" (checkbox visual) en
 * Postulaciones MF26 que refleja si form_reminder_sent_at tiene valor.
 *
 *   form_reminder_sent = IF({form_reminder_sent_at}, "✓", "")  → checkbox
 *
 * Airtable formula con resultado type checkbox: usa formula con "✓" / ""
 * o IF + TRUE/FALSE. Como Airtable Metadata API solo permite formula con
 * resultado checkbox cuando la expresión es 1/0, uso ese formato.
 *
 * Uso: npx tsx scripts/add-form-reminder-checkbox.ts
 *      npx tsx scripts/add-form-reminder-checkbox.ts --apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE = process.env.AIRTABLE_BASE_ID!;
const TABLE_NAME = "Postulaciones MF26";
const NEW_FIELD = "form_reminder_sent";
const SOURCE_FIELD = "form_reminder_sent_at";
const APPLY = process.argv.includes("--apply");

async function main() {
  // 1. Obtener tabla y verificar estado actual
  const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const meta = await metaRes.json();
  const tabla = meta.tables.find((t: { name: string }) => t.name === TABLE_NAME);
  if (!tabla) { console.log(`❌ No encontré la tabla "${TABLE_NAME}"`); return; }

  const tableId = tabla.id;
  const yaExiste = tabla.fields.find((f: { name: string }) => f.name === NEW_FIELD);
  const fuente = tabla.fields.find((f: { name: string }) => f.name === SOURCE_FIELD);

  console.log(`Tabla:           ${TABLE_NAME} (${tableId})`);
  console.log(`Campo fuente:    ${SOURCE_FIELD} → ${fuente ? `existe (${fuente.type})` : "❌ NO existe"}`);
  console.log(`Campo destino:   ${NEW_FIELD} → ${yaExiste ? `ya existe (${yaExiste.type})` : "no existe (lo creo)"}`);

  if (!fuente) { console.log("\n❌ Aborto: el campo fuente no existe."); return; }
  if (yaExiste) {
    console.log(`\n✅ Ya existe. Nada que hacer.`);
    return;
  }

  if (!APPLY) {
    console.log("\nDRY-RUN — corré con --apply para crear el campo.\n");
    console.log("Body que enviaría a POST /meta/bases/.../tables/.../fields:");
    console.log(JSON.stringify({
      name: NEW_FIELD,
      type: "formula",
      description: "Checkbox visual: TRUE cuando form_reminder_sent_at está set",
      options: { formula: `{${SOURCE_FIELD}} != BLANK()` },
    }, null, 2));
    return;
  }

  // 2. Crear el campo formula con resultado boolean
  const createRes = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${tableId}/fields`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: NEW_FIELD,
        type: "formula",
        description: "Checkbox visual: TRUE cuando form_reminder_sent_at está set",
        options: { formula: `{${SOURCE_FIELD}} != BLANK()` },
      }),
    }
  );

  const created = await createRes.json();
  if (!createRes.ok) {
    console.log("\n❌ Error creando campo:");
    console.log(JSON.stringify(created, null, 2));
    return;
  }
  console.log(`\n✅ Campo creado:`);
  console.log(`   name: ${created.name}`);
  console.log(`   id:   ${created.id}`);
  console.log(`   type: ${created.type}`);
  console.log(`   resultType: ${created.options?.result?.type ?? "auto"}`);
  console.log();
  console.log("Verificá en Airtable: ahora aparece columna 'form_reminder_sent' con ✓ en las que tienen timestamp.");
}

main().catch((err) => { console.error("ERROR:", err); process.exit(1); });

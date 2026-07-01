/**
 * Agrega la choice "Actual" al singleSelect `status` de Misiones MF26 usando
 * el mismo truco que WI-1623: PATCH de un record con typecast:true fuerza a
 * Airtable a auto-crear la choice.
 *
 * Es idempotente: si la choice ya existe, no hace nada.
 * Es no-destructivo: elige una mision de prueba (o crea+borra una temporal)
 * y le setea el mismo valor que ya tenia despues de tocar status.
 *
 * Uso:
 *   npx tsx scripts/add-choice-actual-to-mision-status.ts         # dry-run
 *   npx tsx scripts/add-choice-actual-to-mision-status.ts --apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const MISIONES_TABLE_ID = "tbl0ySIkDEmBJWRsx";
const NEW_CHOICE = "Actual";
const APPLY = process.argv.includes("--apply");

async function main() {
  // 1) Ver choices actuales del select status
  const schemaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const schema = (await schemaRes.json()) as any;
  const table = schema.tables.find((t: any) => t.id === MISIONES_TABLE_ID);
  const field = table.fields.find((f: any) => f.name === "status");
  const existing = field.options.choices as { id: string; name: string }[];

  console.log(`\nMisiones MF26 → status (${field.type})`);
  console.log(`Choices actuales: ${existing.map((c) => c.name).join(", ")}\n`);

  if (existing.some((c) => c.name === NEW_CHOICE)) {
    console.log(`✅ "${NEW_CHOICE}" ya existe. Nada que hacer.`);
    return;
  }

  if (!APPLY) {
    console.log(`DRY-RUN — con --apply crearia un record temporal con status="${NEW_CHOICE}" y lo borraria.`);
    return;
  }

  // 2) Crear record temporal con status = Actual usando typecast:true
  console.log(`Creando record temporal con status="${NEW_CHOICE}" (typecast) ...`);
  const createRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${MISIONES_TABLE_ID}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      records: [{ fields: { titulo: "__temp_choice_creation__", status: NEW_CHOICE } }],
      typecast: true,
    }),
  });

  if (!createRes.ok) {
    console.error(`❌ Fallo al crear:`, createRes.status, await createRes.text());
    process.exit(1);
  }

  const parsed = (await createRes.json()) as any;
  const tempId = parsed.records[0].id;
  console.log(`  ✅ Record temporal creado: ${tempId}`);
  console.log(`     status devuelto: "${parsed.records[0].fields.status}"`);

  // 3) Borrar el record temporal
  console.log(`Borrando record temporal ...`);
  const deleteRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${MISIONES_TABLE_ID}/${tempId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${PAT}` },
  });

  if (!deleteRes.ok) {
    console.error(`⚠️  Choice creada pero fallo al borrar el record temporal (${tempId}). Borralo manual.`);
    console.error(await deleteRes.text());
    process.exit(1);
  }

  console.log(`  ✅ Record temporal borrado.\n`);

  // 4) Verificar
  const verifyRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const verifySchema = (await verifyRes.json()) as any;
  const verifyField = verifySchema.tables
    .find((t: any) => t.id === MISIONES_TABLE_ID)
    .fields.find((f: any) => f.name === "status");
  const verified = verifyField.options.choices.some((c: any) => c.name === NEW_CHOICE);

  if (verified) {
    console.log(`✅ Choice "${NEW_CHOICE}" verificada en status.`);
    console.log(`   Choices ahora: ${verifyField.options.choices.map((c: any) => c.name).join(", ")}`);
  } else {
    console.log(`⚠️  Choice NO aparece post-verificacion. Chequear Airtable UI.`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

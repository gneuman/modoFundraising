/**
 * Crea la Automation Rule "Misión activada" en Automation Rules MF26 usando
 * typecast:true, que hace que Airtable auto-cree la choice del singleSelect
 * si no existe. Esto evita el PATCH del field que devuelve 422 con nuestro PAT.
 *
 * Uso: npx tsx scripts/create-rule-mision-activada.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AUTOMATION_RULES_TABLE_ID = "tblpcQ6EdiczQRbTI";
const TEMPLATE_ID = "reczXMu5nZpH7VNk0"; // creado antes

async function main() {
  const rule = {
    fields: {
      name: "Misión activada — correo a founders",
      trigger_event: "mision_activada",
      channel: "email",
      active: true,
      delay_hours: 0,
      order: 1,
      trigger_condition: "",
      template_id: [TEMPLATE_ID],
    },
  };

  // typecast: true → Airtable auto-crea la choice si no existe
  const body = JSON.stringify({ records: [rule], typecast: true });

  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${AUTOMATION_RULES_TABLE_ID}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body,
  });

  console.log(`Status: ${res.status}`);
  const responseBody = await res.text();
  console.log(`Response: ${responseBody}\n`);

  if (!res.ok) {
    console.error(`❌ Fallo. Response arriba.`);
    process.exit(1);
  }

  const parsed = JSON.parse(responseBody);
  console.log(`✅ Regla creada: ${parsed.records[0].id}`);
  console.log(`   trigger_event: ${parsed.records[0].fields.trigger_event}`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

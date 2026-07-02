/**
 * Fix del script anterior: la tabla Consignas MF26 se creó con el campo
 * `startup` linkeado a "🔗 Startups" (tblYM1ZhWFcPg3j7R), pero el resto del
 * schema MF26 (Asistencias, Misiones Completadas, Feedback) linkea a
 * "Startups MF26" (tblBv45W1M9ZITEpe = Tables.STARTUPS).
 *
 * Solución: agregar un nuevo campo `startup_record` (nombre igual al de
 * Asistencias) que linkea a la tabla correcta. El campo viejo `startup` lo
 * borramos manual desde la UI si querés (opcional — Airtable Metadata API
 * no soporta borrar fields).
 *
 * Uso: npx tsx scripts/fix-consignas-startup-link.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

const CONSIGNAS_TABLE_ID = "tbliTlMl0dfbh3HWc";
const STARTUPS_MF26_TABLE_ID = "tblBv45W1M9ZITEpe"; // el que usa el resto del schema

async function addStartupRecordField() {
  const res = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${CONSIGNAS_TABLE_ID}/fields`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "startup_record",
        description: "Link a Startups MF26 (consistente con Asistencias/Misiones Completadas/Feedback)",
        type: "multipleRecordLinks",
        options: { linkedTableId: STARTUPS_MF26_TABLE_ID },
      }),
    },
  );

  const responseBody = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Response: ${responseBody}`);
  if (!res.ok) {
    console.error("❌ Fallo al agregar el campo startup_record");
    process.exit(1);
  }
  const parsed = JSON.parse(responseBody);
  console.log(`\n✅ Campo startup_record agregado: ${parsed.id}`);
  console.log(`\n📝 Recordá: el campo viejo 'startup' (link a '🔗 Startups') queda pero no lo usamos.`);
  console.log("   Podés borrarlo manual desde la UI si querés (Airtable no permite borrar fields via API).");
}

addStartupRecordField().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

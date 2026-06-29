/**
 * Crea los campos invitado_calendar_at (dateTime) e invitado_calendar_by (singleLineText)
 * en Founders MF26 via Airtable Meta API. Idempotente.
 *
 * Uso: npx tsx scripts/setup-invitado-calendar-fields.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_NAME = "Founders MF26";

const FIELDS = [
  {
    name: "invitado_calendar_at",
    type: "dateTime",
    options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "America/Mexico_City" },
    description: "Timestamp del momento en que se invito al founder a los eventos de Google Calendar. Vacio = aun no invitado. Usado por invite-all para evitar reinvitar.",
  },
  {
    name: "invitado_calendar_by",
    type: "singleLineText",
    description: "Email del admin que apreto el boton de invitar a Calendar. Trazabilidad.",
  },
];

async function main() {
  const schemaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  if (!schemaRes.ok) { console.error(schemaRes.status, await schemaRes.text()); process.exit(1); }
  const schema = (await schemaRes.json()) as { tables: { id: string; name: string; fields: { id: string; name: string }[] }[] };
  const table = schema.tables.find((t) => t.name === TABLE_NAME);
  if (!table) { console.error(`Tabla "${TABLE_NAME}" no encontrada`); process.exit(1); }
  console.log(`Tabla: ${table.name} (${table.id})\n`);

  for (const def of FIELDS) {
    const existing = table.fields.find((f) => f.name === def.name);
    if (existing) {
      console.log(`OK ya existe: ${existing.name} (${existing.id})`);
      continue;
    }
    const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${table.id}/fields`, {
      method: "POST",
      headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
      body: JSON.stringify(def),
    });
    if (!res.ok) { console.error(`FAIL ${def.name}:`, res.status, await res.text()); continue; }
    const created = (await res.json()) as { id: string; name: string };
    console.log(`OK creado: ${created.name} (${created.id})`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

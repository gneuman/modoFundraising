/**
 * Crea la tabla `Consignas MF26` en la base MF26 vía Airtable Metadata API.
 *
 * Modelo (mismo patrón que Asistencias MF26):
 *   - id_consigna: autonumber
 *   - startup: multipleRecordLinks → Startups
 *   - tarea: multipleRecordLinks → Tareas MF26
 *   - contenido_texto: multilineText
 *   - adjuntos: multipleAttachments
 *   - url_extra: url
 *   - enviada_at: createdTime
 *   - actualizada_at: lastModifiedTime
 *   - founder_que_envio: singleLineText
 *
 * Uso: npx tsx scripts/create-consignas-table.ts
 *
 * Idempotente: si la tabla ya existe, imprime su ID y sale sin error.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

if (!PAT || !BASE_ID) {
  console.error("Faltan AIRTABLE_PAT o AIRTABLE_BASE_ID en .env.local");
  process.exit(1);
}

// IDs de tablas linkeadas (leídas desde src/lib/airtable.ts:17)
const STARTUPS_TABLE_ID = "tbl15lZTwl0DAeRb8"; // Startups (best-guess; verificamos abajo)
const TAREAS_TABLE_ID = "tblbuljOsP9zSSMpn"; // Tareas MF26

const TABLE_NAME = "Consignas MF26";

async function listTables(): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  if (!res.ok) {
    console.error(`Fallo al listar tablas: ${res.status}`, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  return (data.tables ?? []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }));
}

async function findStartupsTableId(): Promise<string> {
  const tables = await listTables();
  // Usar "Startups MF26" — es la que linkean Asistencias, Misiones Completadas
  // y Feedback. La otra ("🔗 Startups") es una tabla huérfana en el schema MF26.
  const startups = tables.find((t) => t.name === "Startups MF26");
  if (!startups) {
    console.error("No encontré 'Startups MF26' en la base. Tables:", tables.map((t) => t.name));
    process.exit(1);
  }
  return startups.id;
}

async function main() {
  const tables = await listTables();
  const existing = tables.find((t) => t.name === TABLE_NAME);
  if (existing) {
    console.log(`✅ Tabla "${TABLE_NAME}" ya existe: ${existing.id}`);
    console.log(`   → Copiá este ID a src/lib/airtable.ts en Tables.CONSIGNAS`);
    return;
  }

  const startupsId = await findStartupsTableId();
  console.log(`Startups table ID: ${startupsId}`);
  console.log(`Tareas MF26 table ID: ${TAREAS_TABLE_ID}`);
  console.log();

  const payload = {
    name: TABLE_NAME,
    description:
      "Respuestas de founders a tareas tipo Entrega. 1 record por (startup, tarea). Upsert via /api/portal/consignas.",
    fields: [
      {
        // Primary field: texto simple. El endpoint POST /api/portal/consignas
        // escribe aquí el string "<startupRecId>-<tareaRecId>" al crear/update
        // para tener un ID legible + único que sirve como unique key humano.
        // No usamos autoNumber (no soportado en Metadata API al crear) ni
        // formula (tampoco soportado al crear tabla — sería un 2do paso).
        name: "id_consigna",
        type: "singleLineText",
      },
      {
        // Nombre "startup_record" para consistencia con Asistencias MF26 /
        // Feedback MF26 / Misiones Completadas MF26.
        name: "startup_record",
        type: "multipleRecordLinks",
        options: { linkedTableId: startupsId },
      },
      {
        name: "tarea",
        type: "multipleRecordLinks",
        options: { linkedTableId: TAREAS_TABLE_ID },
      },
      {
        name: "contenido_texto",
        type: "multilineText",
      },
      {
        name: "adjuntos",
        type: "multipleAttachments",
      },
      {
        name: "url_extra",
        type: "url",
      },
      {
        // Timestamp ISO 8601 escrito por el endpoint al crear el record.
        // No podemos usar createdTime nativo — Metadata API no lo soporta al
        // crear la tabla. Se puede agregar como computed field después vía UI
        // si se quiere el comportamiento nativo (pero no bloqueante).
        name: "enviada_at",
        type: "singleLineText",
      },
      {
        // Timestamp ISO 8601 escrito por el endpoint en cada upsert.
        // Mismo motivo: lastModifiedTime tampoco es soportado al crear.
        name: "actualizada_at",
        type: "singleLineText",
      },
      {
        name: "founder_que_envio",
        type: "singleLineText",
      },
    ],
  };

  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Response: ${responseBody}\n`);

  if (!res.ok) {
    console.error("❌ Fallo al crear la tabla.");
    process.exit(1);
  }

  const parsed = JSON.parse(responseBody);
  console.log(`✅ Tabla "${TABLE_NAME}" creada: ${parsed.id}`);
  console.log(`   → Agregar a src/lib/airtable.ts:`);
  console.log(`     CONSIGNAS: "${parsed.id}", // ${TABLE_NAME}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

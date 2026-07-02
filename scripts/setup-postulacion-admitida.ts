/**
 * Crea el campo `admission_email_sent_at` en Postulaciones MF26.
 *
 * Sirve como campo de idempotencia para el webhook /api/airtable/postulacion-admitida:
 * mientras tenga valor, el webhook no re-envía el correo. Vaciarlo manualmente en
 * Airtable fuerza el re-envío (útil para reenviar el checkout después de reenviar
 * un cupón, cambiar el descuento, etc.).
 *
 * Idempotente: si el campo ya existe, no hace nada.
 *
 * Uso:
 *   npx tsx scripts/setup-postulacion-admitida.ts         # dry-run
 *   npx tsx scripts/setup-postulacion-admitida.ts --apply # ejecuta
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const APPLY = process.argv.includes("--apply");

// Ver src/lib/airtable.ts → Tables.POSTULACIONES
const POSTULACIONES_TABLE_ID = "tblqj2eJMHpEqLxqv";

const FIELD = {
  name: "admission_email_sent_at",
  type: "dateTime" as const,
  options: {
    dateFormat: { name: "iso" as const },
    timeFormat: { name: "24hour" as const },
    timeZone: "America/Santiago",
  },
  description:
    "Timestamp de cuándo se envió el correo de admisión (via admin PATCH o webhook postulacion-admitida). Usado para idempotencia: mientras tenga valor, el webhook no re-envía. Vaciar manual para forzar re-envío.",
};

async function metaFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.airtable.com/v0/meta${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Meta API ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

interface Schema {
  tables: { id: string; name: string; fields: { id: string; name: string; type: string }[] }[];
}

async function main() {
  if (!PAT || !BASE_ID) {
    console.error("Falta AIRTABLE_PAT o AIRTABLE_BASE_ID en .env.local");
    process.exit(1);
  }

  console.log(`\n[setup-postulacion-admitida] base=${BASE_ID} mode=${APPLY ? "APPLY" : "DRY-RUN"}\n`);
  console.log("── Campo admission_email_sent_at en Postulaciones MF26 ──");

  const schema = await metaFetch<Schema>(`/bases/${BASE_ID}/tables`);
  const table = schema.tables.find((t) => t.id === POSTULACIONES_TABLE_ID);
  if (!table) throw new Error(`Tabla ${POSTULACIONES_TABLE_ID} no encontrada`);

  const existing = table.fields.find((f) => f.name === FIELD.name);
  if (existing) {
    console.log(`  ✅ Ya existe (${existing.id}, type ${existing.type}). Nada que hacer.\n`);
    return;
  }

  if (!APPLY) {
    console.log(`  DRY-RUN — body: ${JSON.stringify(FIELD, null, 2)}\n`);
    console.log("Corré con --apply para crear el campo.\n");
    return;
  }

  const created = await metaFetch<{ id: string; name: string; type: string }>(
    `/bases/${BASE_ID}/tables/${POSTULACIONES_TABLE_ID}/fields`,
    { method: "POST", body: JSON.stringify(FIELD) },
  );
  console.log(`  ✅ Creado: ${created.name} (${created.id})\n`);

  console.log("Siguientes pasos:");
  console.log("  1. Agregar 'admission_email_sent_at?: string' al type PostulacionRecord en src/lib/airtable.ts");
  console.log("  2. Crear endpoint POST /api/airtable/postulacion-admitida");
  console.log("  3. Crear Airtable Automation en la UI que dispare al webhook");
  console.log("     cuando status = 'Admitida' AND admission_email_sent_at is empty\n");
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

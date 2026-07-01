/**
 * Setup completo del flujo "Misión Activa → correo a founders" (WI-1623):
 *
 *   1. Crea campo `notif_enviada_at` (dateTime) en Misiones MF26.
 *   2. Crea el Email Template `mision_activada` en Email Templates MF26.
 *   3. Crea la Automation Rule con trigger_event = mision_activada.
 *
 * Idempotente: si algo ya existe, lo saltea.
 *
 * Después de correr esto, falta UN paso manual que NO se puede via API:
 *   Crear la Airtable Automation en la UI (ver docs/setup-airtable-webhook-mision-activada.md sección 4).
 *
 * Uso:
 *   npx tsx scripts/setup-mision-activada.ts         # dry-run
 *   npx tsx scripts/setup-mision-activada.ts --apply # ejecuta
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const APPLY = process.argv.includes("--apply");

// Table IDs (ver src/lib/airtable.ts → Tables)
const MISIONES_TABLE_ID = "tbl0ySIkDEmBJWRsx";
const EMAIL_TEMPLATES_TABLE_ID = "tblZ3Tm34wzThvXl2";
const AUTOMATION_RULES_TABLE_ID = "tblpcQ6EdiczQRbTI";

const base = new Airtable({ apiKey: PAT }).base(BASE_ID);

// ─── Definiciones ───────────────────────────────────────────────────────────

const NOTIF_FIELD = {
  name: "notif_enviada_at",
  type: "dateTime" as const,
  options: {
    dateFormat: { name: "iso" as const },
    timeFormat: { name: "24hour" as const },
    timeZone: "America/Santiago",
  },
  description:
    "Timestamp de cuándo se disparó el webhook /api/airtable/mision-activada. Usado para idempotencia: mientras tenga valor, el webhook no re-envía correos. Vaciar manual para forzar re-envío.",
};

const TEMPLATE = {
  name: "mision_activada",
  label: "Misión Activa — aviso a founders",
  subject: "Nueva misión: {{mision_titulo}}",
  active: true,
  body_html: `<h2 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 16px;">Hola {{nombre}},</h2>

<p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 20px;">Se activó una nueva misión en el portal. Es hora de ponerse a trabajar.</p>

<div style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:8px;padding:20px;margin:0 0 24px;">
  <p style="color:#6b21a8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Misión</p>
  <p style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 12px;">{{mision_titulo}}</p>
  <p style="color:#475569;font-size:15px;line-height:1.6;margin:0;">{{mision_descripcion}}</p>
</div>

<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 8px;">
  <strong style="color:#0f172a;">Fecha límite:</strong> {{fecha_limite}}
</p>

<div style="margin:32px 0;text-align:center;">
  <a href="{{portal_url}}" style="display:inline-block;background:#0f172a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Ver misión en el portal →</a>
</div>

<p style="color:#64748b;font-size:13px;line-height:1.5;margin:24px 0 0;">
  Si tenés dudas, respondé a este correo o escribí en el canal de Slack del cohort.
</p>`,
};

const RULE = {
  name: "Misión activada — correo a founders",
  trigger_event: "mision_activada",
  channel: "email",
  active: true,
  delay_hours: 0,
  order: 1,
  trigger_condition: "",
  // template_id se resuelve dinámico después de crear/encontrar el template.
};

// ─── Utilities ──────────────────────────────────────────────────────────────

async function metaFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.airtable.com/v0/meta${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Meta API ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

interface Schema {
  tables: { id: string; name: string; fields: { id: string; name: string; type: string }[] }[];
}

// ─── Paso 1: campo notif_enviada_at ────────────────────────────────────────

async function ensureNotifField(): Promise<void> {
  console.log("── Paso 1: campo notif_enviada_at en Misiones MF26 ──");
  const schema = await metaFetch<Schema>(`/bases/${BASE_ID}/tables`);
  const table = schema.tables.find((t) => t.id === MISIONES_TABLE_ID);
  if (!table) throw new Error(`Tabla ${MISIONES_TABLE_ID} no encontrada`);

  const existing = table.fields.find((f) => f.name === NOTIF_FIELD.name);
  if (existing) {
    console.log(`  ✅ Ya existe (${existing.id}, type ${existing.type}). Skip.\n`);
    return;
  }

  if (!APPLY) {
    console.log(`  DRY-RUN — body: ${JSON.stringify(NOTIF_FIELD)}\n`);
    return;
  }

  const created = await metaFetch<{ id: string; name: string; type: string }>(
    `/bases/${BASE_ID}/tables/${MISIONES_TABLE_ID}/fields`,
    { method: "POST", body: JSON.stringify(NOTIF_FIELD) },
  );
  console.log(`  ✅ Creado: ${created.name} (${created.id})\n`);
}

// ─── Paso 2: email template ────────────────────────────────────────────────

async function ensureTemplate(): Promise<string> {
  console.log("── Paso 2: template mision_activada en Email Templates MF26 ──");
  const existing = await base(EMAIL_TEMPLATES_TABLE_ID)
    .select({ filterByFormula: `{name} = "${TEMPLATE.name}"`, maxRecords: 1 })
    .all();

  if (existing.length) {
    const rec = existing[0];
    console.log(`  ✅ Ya existe (${rec.id}). Skip.\n`);
    return rec.id;
  }

  if (!APPLY) {
    console.log(`  DRY-RUN — subject: "${TEMPLATE.subject}", active: ${TEMPLATE.active}\n`);
    return "TEMPLATE_ID_PLACEHOLDER";
  }

  const created = await base(EMAIL_TEMPLATES_TABLE_ID).create([{ fields: TEMPLATE as never }]);
  const id = created[0].id;
  console.log(`  ✅ Creado: ${TEMPLATE.name} (${id})\n`);
  return id;
}

// ─── Paso 2.5: agregar "mision_activada" al select trigger_event ───────────
// El campo trigger_event de Automation Rules MF26 es un single-select con
// opciones fijas. Antes de crear la rule tenemos que asegurarnos que el valor
// exista en las choices, si no, Airtable rechaza con INVALID_MULTIPLE_CHOICE_OPTIONS.

async function ensureTriggerEventChoice(): Promise<void> {
  console.log("── Paso 2.5: opción 'mision_activada' en select trigger_event ──");
  // Fetch por endpoint especifico del field (mas confiable que /tables para PATCH)
  const tables = await metaFetch<{
    tables: { id: string; fields: { id: string; name: string; type: string; options?: { choices?: { id: string; name: string; color?: string }[] } }[] }[];
  }>(`/bases/${BASE_ID}/tables?include=visibleFieldIds`);
  const table = tables.tables.find((t) => t.id === AUTOMATION_RULES_TABLE_ID);
  if (!table) throw new Error(`Tabla ${AUTOMATION_RULES_TABLE_ID} no encontrada`);

  const field = table.fields.find((f) => f.name === "trigger_event");
  if (!field) throw new Error("Campo 'trigger_event' no encontrado");

  const choices = field.options?.choices ?? [];
  if (choices.some((c) => c.name === "mision_activada")) {
    console.log(`  ✅ Ya existe la opción 'mision_activada'. Skip.\n`);
    return;
  }

  if (!APPLY) {
    console.log(`  DRY-RUN — agregaria choice 'mision_activada' (choices actuales: ${choices.length})\n`);
    return;
  }

  // Preservar id de existentes (Airtable las identifica por id, no name).
  // A las existentes SIN color no las molestamos; a las que tienen color se lo
  // preservamos. La nueva no lleva color (Airtable asigna default).
  const newChoices = [
    ...choices.map((c) => (c.color ? { id: c.id, name: c.name, color: c.color } : { id: c.id, name: c.name })),
    { name: "mision_activada" },
  ];

  // Airtable Meta API PATCH de field: enviar solo `options` (sin `type`).
  const patchBody = { options: { choices: newChoices } };
  const patchRes = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${table.id}/fields/${field.id}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    },
  );
  if (!patchRes.ok) {
    const errBody = await patchRes.text();
    console.error("  Body enviado:", JSON.stringify(patchBody));
    throw new Error(`PATCH field trigger_event → ${patchRes.status} ${errBody}`);
  }
  console.log(`  ✅ Agregada opción 'mision_activada' al select trigger_event.\n`);
}

// ─── Paso 3: automation rule ───────────────────────────────────────────────

async function ensureRule(templateId: string): Promise<void> {
  console.log("── Paso 3: Automation Rule mision_activada en Automation Rules MF26 ──");
  const existing = await base(AUTOMATION_RULES_TABLE_ID)
    .select({ filterByFormula: `{trigger_event} = "${RULE.trigger_event}"`, maxRecords: 1 })
    .all();

  if (existing.length) {
    const rec = existing[0];
    console.log(`  ✅ Ya existe (${rec.id}). Skip.\n`);
    return;
  }

  if (!APPLY) {
    console.log(`  DRY-RUN — rule: ${JSON.stringify({ ...RULE, template_id: [templateId] })}\n`);
    return;
  }

  const created = await base(AUTOMATION_RULES_TABLE_ID).create([
    { fields: { ...RULE, template_id: [templateId] } as never },
  ]);
  console.log(`  ✅ Creada: ${RULE.name} (${created[0].id})\n`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!PAT || !BASE_ID) {
    console.error("Falta AIRTABLE_PAT o AIRTABLE_BASE_ID en .env.local");
    process.exit(1);
  }

  console.log(`\n[setup-mision-activada] base=${BASE_ID} mode=${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  await ensureNotifField();
  const templateId = await ensureTemplate();
  await ensureTriggerEventChoice();
  await ensureRule(templateId);

  if (!APPLY) {
    console.log("DRY-RUN — corré con --apply para ejecutar.\n");
  } else {
    console.log("Listo. Siguiente paso manual (NO se puede vía API):");
    console.log("  → Crear la Airtable Automation en la UI.");
    console.log("  → Ver docs/setup-airtable-webhook-mision-activada.md sección 4-5.\n");
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

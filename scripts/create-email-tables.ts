/**
 * Crea las tablas "Email Templates MF26" y "Automation Rules MF26" en Airtable
 * usando la Metadata API.
 * Ejecutar: npx tsx scripts/create-email-tables.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

const headers = {
  Authorization: `Bearer ${PAT}`,
  "Content-Type": "application/json",
};

async function listTables(): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, { headers });
  const data = await res.json() as { tables: { id: string; name: string }[] };
  return data.tables ?? [];
}

async function createTable(name: string, fields: object[]) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, fields }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Error creating table:", JSON.stringify(data, null, 2));
    throw new Error(`Failed to create table "${name}": ${res.status}`);
  }
  return data as { id: string; name: string };
}

const EMAIL_TEMPLATES_FIELDS = [
  { name: "name",      type: "singleLineText" },
  { name: "label",     type: "singleLineText" },
  { name: "subject",   type: "singleLineText" },
  { name: "body_html", type: "multilineText" },
  { name: "active",    type: "checkbox", options: { icon: "check", color: "greenBright" } },
];

const AUTOMATION_RULES_FIELDS = [
  { name: "name",              type: "singleLineText" },
  {
    name: "trigger_event",
    type: "singleSelect",
    options: {
      choices: [
        { name: "checkout_completed" },
        { name: "invoice_paid_cuota2" },
        { name: "invoice_paid_cuota3" },
        { name: "payment_failed_1" },
        { name: "payment_failed_2" },
        { name: "payment_failed_3" },
        { name: "admission_approved" },
        { name: "admission_rejected" },
        { name: "follow_up_1" },
        { name: "follow_up_2" },
        { name: "subscription_cancelled" },
        { name: "portal_deactivated" },
        { name: "application_received" },
        { name: "onboarding" },
      ],
    },
  },
  { name: "trigger_condition", type: "singleLineText" },
  { name: "delay_hours",       type: "number", options: { precision: 0 } },
  {
    name: "channel",
    type: "singleSelect",
    options: { choices: [{ name: "email" }, { name: "whatsapp" }] },
  },
  { name: "active", type: "checkbox", options: { icon: "check", color: "greenBright" } },
  { name: "order",  type: "number", options: { precision: 0 } },
];

async function main() {
  console.log(`Base: ${BASE_ID}\n`);

  const existing = await listTables();
  const existingNames = existing.map((t) => t.name);
  console.log("Tablas existentes:", existingNames.join(", ") || "(ninguna)");

  // ── Email Templates MF26 ──────────────────────────────────────────────────
  if (existingNames.includes("Email Templates MF26")) {
    console.log("\n✓ Tabla \"Email Templates MF26\" ya existe — saltando");
  } else {
    console.log("\nCreando \"Email Templates MF26\"...");
    const t = await createTable("Email Templates MF26", EMAIL_TEMPLATES_FIELDS);
    console.log(`  ✓ Creada (id: ${t.id})`);
  }

  // ── Automation Rules MF26 — necesita template_id como linkedRecord ────────
  // La linkedRecord a Email Templates se agrega después porque necesitamos el
  // ID de la tabla de templates para crear el campo de link.
  if (existingNames.includes("Automation Rules MF26")) {
    console.log("✓ Tabla \"Automation Rules MF26\" ya existe — saltando");
  } else {
    console.log("\nCreando \"Automation Rules MF26\" (sin el link todavía)...");
    const t = await createTable("Automation Rules MF26", AUTOMATION_RULES_FIELDS);
    console.log(`  ✓ Creada (id: ${t.id})`);

    // Ahora agregamos el campo linkedRecord a Email Templates
    const allTables = await listTables();
    const templatesTable = allTables.find((t) => t.name === "Email Templates MF26");
    if (templatesTable) {
      console.log("\nAgregando campo 'template_id' (linked record) a Automation Rules MF26...");
      const rulesTable = allTables.find((t) => t.name === "Automation Rules MF26")!;
      const res = await fetch(
        `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${rulesTable.id}/fields`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: "template_id",
            type: "multipleRecordLinks",
            options: { linkedTableId: templatesTable.id },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        console.warn("  ! No se pudo crear el campo linked record:", JSON.stringify(data));
        console.warn("  → Créalo manualmente en Airtable: campo 'template_id' → Link to Email Templates MF26");
      } else {
        console.log("  ✓ Campo template_id creado");
      }
    }
  }

  console.log("\nListo ✓ — Ahora corre: npx tsx scripts/seed-email-templates.ts");
}

main().catch((err) => { console.error(err); process.exit(1); });

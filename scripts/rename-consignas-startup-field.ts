/**
 * Renombra el campo `startup` (mal linkeado a "🔗 Startups") a
 * `startup_deprecated_wrong_link` para que quede claro que no se usa.
 *
 * El campo correcto es `startup_record` (link a "Startups MF26"), agregado
 * por scripts/fix-consignas-startup-link.ts.
 *
 * Uso: npx tsx scripts/rename-consignas-startup-field.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

const CONSIGNAS_TABLE_ID = "tbliTlMl0dfbh3HWc";
const WRONG_STARTUP_FIELD_ID = "fldlFtSXBnuU130Bf"; // el que apunta a 🔗 Startups

async function main() {
  const res = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${CONSIGNAS_TABLE_ID}/fields/${WRONG_STARTUP_FIELD_ID}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "startup_deprecated_wrong_link",
        description: "NO USAR. Link errado a '🔗 Startups'. El campo bueno es startup_record.",
      }),
    },
  );
  const body = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Response: ${body}`);
  if (!res.ok) process.exit(1);
  console.log("\n✅ Campo renombrado. Borralo manual desde la UI cuando puedas.");
}

main().catch((e) => { console.error(e); process.exit(1); });

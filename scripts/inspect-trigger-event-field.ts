/**
 * Muestra el schema completo del field trigger_event en Automation Rules MF26.
 * Uso para debug del setup-mision-activada.ts paso 2.5.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AUTOMATION_RULES_TABLE_ID = "tblpcQ6EdiczQRbTI";

async function main() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const schema = (await res.json()) as any;
  const table = schema.tables.find((t: any) => t.id === AUTOMATION_RULES_TABLE_ID);
  const field = table.fields.find((f: any) => f.name === "trigger_event");
  console.log(JSON.stringify(field, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });

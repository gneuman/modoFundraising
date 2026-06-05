/**
 * Lee el template "pago_fallido_1" de Airtable para mostrar el copy real
 * que recibiría un founder en el aviso "will_send_reminder_1".
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT! })
  .base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  const records = await base("Email Templates MF26")
    .select({ filterByFormula: `OR({name}="pago_fallido_1",{name}="pago_fallido_2",{name}="pago_fallido_3")` })
    .all();

  for (const r of records) {
    const f = r.fields as Record<string, unknown>;
    console.log(`\n══════════ ${f.name} ══════════`);
    console.log(`Subject:  ${f.subject}`);
    console.log(`Campos disponibles: ${Object.keys(f).join(", ")}`);
    console.log(`──── BODY ────`);
    for (const key of Object.keys(f)) {
      if (key !== "name" && key !== "subject" && typeof f[key] === "string" && (f[key] as string).length > 50) {
        console.log(`\n[campo: ${key}]\n${f[key]}\n`);
      }
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });

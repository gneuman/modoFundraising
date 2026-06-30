/**
 * Lista los founders pendientes de onboarding masivo.
 * Pendiente = portal_access=1 AND onboarding_enviado_at vacio.
 * Excluye al admin (ADMIN_EMAIL).
 */
import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);
const ADMIN_EMAIL = "gnb@teknobuilding.com";

async function main() {
  const recs = await base("tblTif15ehnRN4K74")
    .select({
      filterByFormula: `AND({portal_access} = 1, {onboarding_enviado_at} = "")`,
      fields: ["email", "first_name", "last_name", "invitado_calendar_at"],
    })
    .all();

  const eligibles = recs.filter((r) => {
    const email = ((r.fields as any).email ?? "").toLowerCase();
    return email && email !== ADMIN_EMAIL.toLowerCase();
  });

  console.log(`Pendientes (portal_access=1, onboarding_enviado_at vacio, excluyendo admin): ${eligibles.length}\n`);
  eligibles.forEach((r, i) => {
    const f = r.fields as any;
    const calMark = f.invitado_calendar_at ? "✓ cal" : "  cal";
    console.log(`  ${String(i + 1).padStart(2, "0")}. ${r.id} | ${f.email} | ${f.first_name} ${f.last_name ?? ""} | ${calMark}`);
  });
}
main().catch(console.error);

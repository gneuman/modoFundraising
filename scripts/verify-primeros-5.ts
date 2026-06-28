import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

const EMAILS = [
  "javier@hidrogenios.mx",
  "direccion@maity.cloud",
  "manuel@aindez.com",
  "joselyne@drex.network",
  "pablo@nfit.app",
];

async function main() {
  console.log("Estado de los primeros 5 founders en Airtable:\n");
  for (const email of EMAILS) {
    const recs = await base("Founders MF26")
      .select({ filterByFormula: `LOWER({email}) = "${email}"`, maxRecords: 1 })
      .firstPage();
    if (!recs.length) { console.log(`  ${email}: NO encontrado`); continue; }
    const f = recs[0].fields as any;
    console.log(`${email} (${f.first_name})`);
    console.log(`   onboarding_enviado_at: ${f.onboarding_enviado_at ?? "(vacio)"}`);
    console.log(`   invitado_calendar_at:  ${f.invitado_calendar_at ?? "(vacio)"}`);
    console.log(`   invitado_calendar_by:  ${f.invitado_calendar_by ?? "(vacio)"}`);
  }

  // Cuanto queda
  const pendientes = await base("Founders MF26")
    .select({ filterByFormula: `AND({portal_access} = 1, {onboarding_enviado_at} = "")`, fields: ["email"] })
    .all();
  const pendNoAdmin = pendientes.filter((r) => ((r.fields as any).email ?? "").toLowerCase() !== "gnb@teknobuilding.com");
  console.log(`\nRestan: ${pendNoAdmin.length} founders pendientes.`);
}
main().catch(console.error);

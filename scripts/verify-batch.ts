/**
 * Verifica el estado global del onboarding masivo:
 * - cuantos enviados (onboarding_enviado_at != "")
 * - cuantos invitados al calendar
 * - cuantos quedan
 */
import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);
const ADMIN_EMAIL = "gnb@teknobuilding.com";

async function main() {
  const todos = await base("tblTif15ehnRN4K74")
    .select({
      filterByFormula: `{portal_access} = 1`,
      fields: ["email", "first_name", "onboarding_enviado_at", "invitado_calendar_at"],
    })
    .all();

  const noAdmin = todos.filter((r) => ((r.fields as any).email ?? "").toLowerCase() !== ADMIN_EMAIL.toLowerCase());
  const enviados = noAdmin.filter((r) => (r.fields as any).onboarding_enviado_at);
  const invitadosCal = noAdmin.filter((r) => (r.fields as any).invitado_calendar_at);
  const pendientes = noAdmin.filter((r) => !(r.fields as any).onboarding_enviado_at);

  console.log(`=== Estado masivo ===`);
  console.log(`Total con portal_access (sin admin): ${noAdmin.length}`);
  console.log(`Correo onboarding enviado:           ${enviados.length}`);
  console.log(`Invitado al calendar:                ${invitadosCal.length}`);
  console.log(`Pendientes:                          ${pendientes.length}`);

  if (pendientes.length && pendientes.length <= 10) {
    console.log(`\nPendientes:`);
    pendientes.forEach((r) => {
      const f = r.fields as any;
      console.log(`  - ${f.email} | ${f.first_name}`);
    });
  }
}
main().catch(console.error);

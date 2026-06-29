/**
 * Resetea TODOS los campos de tracking de neumang@gmail.com
 * para volver a probar el flujo desde cero.
 */
import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);
const NEUMANG_ID = "recBmSJYoWsk3SgyT";

async function main() {
  await base("Founders MF26").update([
    {
      id: NEUMANG_ID,
      fields: {
        onboarding_enviado_at: null,
        invitado_calendar_at: null,
        invitado_calendar_by: null,
      } as never,
    },
  ]);
  const r = await base("Founders MF26").find(NEUMANG_ID);
  const f = r.fields as any;
  console.log(`OK reset:`);
  console.log(`  ${f.email}`);
  console.log(`  portal_access=${f.portal_access === true}`);
  console.log(`  onboarding_enviado_at=${f.onboarding_enviado_at ?? "(vacio)"}`);
  console.log(`  invitado_calendar_at=${f.invitado_calendar_at ?? "(vacio)"}`);
  console.log(`  invitado_calendar_by=${f.invitado_calendar_by ?? "(vacio)"}`);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

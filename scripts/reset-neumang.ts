/**
 * Limpia onboarding_enviado_at de neumang@gmail.com en Founders MF26
 * para volver a probar el flujo completo desde cero.
 */
import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);
const NEUMANG_ID = "recBmSJYoWsk3SgyT";

async function main() {
  await base("Founders MF26").update([
    { id: NEUMANG_ID, fields: { onboarding_enviado_at: null } as never },
  ]);
  const r = await base("Founders MF26").find(NEUMANG_ID);
  const f = r.fields as any;
  console.log(`OK reset. ${f.email} | onboarding_enviado_at=${f.onboarding_enviado_at ?? "(vacio)"}`);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

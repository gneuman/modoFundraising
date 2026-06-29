import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  const r = await base("Founders MF26").find("recBmSJYoWsk3SgyT");
  const f = r.fields as any;
  console.log("email:                 ", f.email);
  console.log("portal_access:         ", f.portal_access);
  console.log("onboarding_enviado_at: ", f.onboarding_enviado_at ?? "(vacio)");
  console.log("invitado_calendar_at:  ", f.invitado_calendar_at ?? "(vacio)");
  console.log("invitado_calendar_by:  ", f.invitado_calendar_by ?? "(vacio)");
}
main().catch(console.error);

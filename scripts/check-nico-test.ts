import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

const NICO_TEST_IDS = ["recMVLn7MdW1k6n8u", "recBmSJYoWsk3SgyT", "recu5k2irwRmElOeu"];

async function main() {
  console.log("Founders ligados a la postulacion Test de Nicole Macchiavello:\n");
  for (const id of NICO_TEST_IDS) {
    const r = await base("Founders MF26").find(id).catch(() => null);
    if (!r) { console.log(`  ${id}: NO encontrado`); continue; }
    const f = r.fields as any;
    console.log(`  ${id} | ${f.email} | ${f.first_name} ${f.last_name ?? ""}`);
    console.log(`    portal_access=${f.portal_access === true} | onboarding_enviado_at=${f.onboarding_enviado_at ?? "(vacio)"}`);
  }
}
main().catch(console.error);

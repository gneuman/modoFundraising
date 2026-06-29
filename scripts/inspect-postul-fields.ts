import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  const recs = await base("Postulaciones MF26")
    .select({ filterByFormula: `OR({status}="Admitida", {status}="Inscrita")`, maxRecords: 3 })
    .all();
  for (const r of recs) {
    console.log("---");
    console.log("ID:", r.id);
    console.log("Fields:", Object.keys(r.fields));
    console.log("status:", (r.fields as any).status);
    console.log("email:", (r.fields as any).email);
    console.log("first_name:", (r.fields as any).first_name);
    // Imprimir el field que apunte a founders
    for (const k of Object.keys(r.fields)) {
      const v = (r.fields as any)[k];
      if (Array.isArray(v) && v[0]?.startsWith?.("rec")) {
        console.log(`  link field '${k}':`, v);
      }
    }
  }
}
main().catch(console.error);

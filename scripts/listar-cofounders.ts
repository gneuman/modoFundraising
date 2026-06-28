/**
 * Lista cofounders: todos los founders de un startup Inscrito
 * que NO son founder_record (titulares) de la postulacion.
 */
import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  // Postulaciones Inscritas
  const posts = await base("Postulaciones MF26")
    .select({ filterByFormula: `{status} = "Inscrita"` })
    .all();

  console.log(`Postulaciones Inscritas: ${posts.length}\n`);

  let totalCofounders = 0;
  for (const p of posts) {
    const pf = p.fields as any;
    const startupId = (pf.startup_record as string[])?.[0];
    if (!startupId) continue;
    const titulares = new Set((pf.founder_record as string[]) ?? []);

    // Leer el startup para obtener todos sus founders
    const startup = await base("Startups MF26").find(startupId).catch(() => null);
    if (!startup) continue;
    const sf = startup.fields as any;
    const startupName = sf.startup_name ?? "?";

    // El campo de founders linkeados en Startups
    const allFounders = (sf["Founders MF26"] as string[]) ?? (sf["Founders"] as string[]) ?? [];
    const cofounderIds = allFounders.filter((id) => !titulares.has(id));

    if (!cofounderIds.length) continue;

    console.log(`Startup: ${startupName}`);
    for (const id of cofounderIds) {
      const r = await base("Founders MF26").find(id).catch(() => null);
      if (!r) continue;
      const f = r.fields as any;
      console.log(`  - ${f.email} | ${f.first_name} ${f.last_name} | portal_access=${f.portal_access === true}`);
      totalCofounders++;
    }
  }
  console.log(`\nTotal cofounders en startups Inscritos: ${totalCofounders}`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

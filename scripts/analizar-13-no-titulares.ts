/**
 * Para los 13 founders sin portal_access, ver su postulacion y status real.
 * Tambien lista los cofounders por cada postulacion Admitida/Inscrita.
 */
import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

const SIN_ACCESO = [
  "monicaoc6@gmail.com","tomas@glampi.com","hsatler@mynova.eco","pmanangon@migsalud.com",
  "contact@openmall.app","JRN.01@OUTLOOK.COM","goer.social@gmail.com","alfonso@osirisxp.com",
  "nicolasdavid@gmail.com","majo@tophunting.ai","gilles@binkbe.com","francisco@fintezia.com",
  "corine@liarh.com",
];

async function main() {
  // 1. Postulaciones activas
  const posts = await base("Postulaciones MF26")
    .select({ filterByFormula: `OR({status}="Admitida", {status}="Inscrita")` })
    .all();

  // 2. Para cada uno de los 13, encontrar su postulacion y startup
  console.log("=== POR QUE LOS 13 SIN ACCESO NO ESTAN EN LA VISTA ===\n");
  for (const email of SIN_ACCESO) {
    const founderRec = await base("Founders MF26")
      .select({ filterByFormula: `LOWER({email}) = "${email.toLowerCase()}"`, fields: ["email", "first_name", "last_name"] })
      .firstPage();
    if (!founderRec.length) {
      console.log(`${email}: NO existe en Founders MF26`);
      continue;
    }
    const fid = founderRec[0].id;
    const ff = founderRec[0].fields as any;
    // Buscar postulaciones donde aparezca como founder_record
    const postsDeFounder = posts.filter((p) => {
      const ids = (p.fields as any).founder_record as string[] | undefined;
      return ids?.includes(fid);
    });
    if (!postsDeFounder.length) {
      console.log(`${email} (${ff.first_name} ${ff.last_name}): SIN postulacion Admitida/Inscrita`);
      continue;
    }
    for (const p of postsDeFounder) {
      const pf = p.fields as any;
      console.log(`${email} (${ff.first_name} ${ff.last_name})`);
      console.log(`  Postulacion ${p.id} | status=${pf.status} | startup=${(pf["startup_name (from startup_record)"] ?? "?")}`);
    }
  }

  // 3. Lista de cofounders (founders ligados via startup pero NO titulares)
  console.log("\n\n=== COFOUNDERS POR STARTUP ACTIVO ===\n");
  for (const p of posts) {
    const pf = p.fields as any;
    const titulares = (pf.founder_record as string[]) ?? [];
    const todos = (pf["Founders (from startup_record)"] as string[]) ?? [];
    const cofounders = todos.filter((id) => !titulares.includes(id));
    if (!cofounders.length) continue;
    const startup = pf["startup_name (from startup_record)"] ?? "?";
    console.log(`Startup: ${startup} | postulacion ${p.id} status=${pf.status}`);
    for (const id of cofounders) {
      const r = await base("Founders MF26").find(id).catch(() => null);
      if (!r) continue;
      const f = r.fields as any;
      console.log(`  COFOUNDER: ${f.email} | ${f.first_name} ${f.last_name} | portal_access=${f.portal_access === true}`);
    }
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

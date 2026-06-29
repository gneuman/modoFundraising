import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  // Solo INSCRITAS (no Admitidas)
  const posts = await base("Postulaciones MF26")
    .select({ filterByFormula: `{status} = "Inscrita"` })
    .all();
  console.log(`Postulaciones Inscritas: ${posts.length}`);

  const titularIds = new Set<string>();
  for (const p of posts) {
    const ids = (p.fields as any).founder_record as string[] | undefined;
    if (ids) ids.forEach((id) => titularIds.add(id));
  }
  console.log(`Founders titulares Inscritos: ${titularIds.size}`);

  // Cruce con portal_access
  const conAcceso = await base("Founders MF26")
    .select({ filterByFormula: `{portal_access} = 1`, fields: ["email", "first_name", "last_name"] })
    .all();
  const conAccesoIds = new Set(conAcceso.map((r) => r.id));

  const titularesConAcceso = [...titularIds].filter((id) => conAccesoIds.has(id));
  const titularesSinAcceso = [...titularIds].filter((id) => !conAccesoIds.has(id));
  const conAccesoNoInscritos = [...conAccesoIds].filter((id) => !titularIds.has(id));

  console.log(`Titulares Inscritos con portal_access: ${titularesConAcceso.length}`);
  console.log(`Titulares Inscritos SIN portal_access: ${titularesSinAcceso.length}`);
  console.log(`Con portal_access pero NO en Inscritos: ${conAccesoNoInscritos.length}`);

  if (titularesSinAcceso.length) {
    console.log(`\n--- Inscritos sin portal_access (faltarian) ---`);
    for (const id of titularesSinAcceso) {
      const r = await base("Founders MF26").find(id).catch(() => null);
      if (r) console.log(`  ${(r.fields as any).email} | ${(r.fields as any).first_name} ${(r.fields as any).last_name}`);
    }
  }
  if (conAccesoNoInscritos.length) {
    console.log(`\n--- Con portal_access pero NO Inscritos (extras) ---`);
    for (const id of conAccesoNoInscritos) {
      const r = conAcceso.find((x) => x.id === id);
      const f = r?.fields as any;
      console.log(`  ${f?.email} | ${f?.first_name} ${f?.last_name}`);
    }
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

/**
 * Verifica que los founders con portal_access=true coincidan con los
 * founder_record (titulares) de las postulaciones en estado Admitida/Inscrita.
 * Imprime cualquier discrepancia.
 */
import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  // Postulaciones activas (proxy de la vista)
  const posts = await base("Postulaciones MF26")
    .select({ filterByFormula: `OR({status}="Admitida", {status}="Inscrita")` })
    .all();

  console.log(`Postulaciones Admitida/Inscrita: ${posts.length}`);

  // founder_record = founder titular de cada postulacion
  const titularIds = new Set<string>();
  for (const p of posts) {
    const ids = (p.fields as any).founder_record as string[] | undefined;
    if (ids) ids.forEach((id) => titularIds.add(id));
  }
  console.log(`Founders titulares (unicos): ${titularIds.size}`);

  // Founders con portal_access=true
  const conAcceso = await base("Founders MF26")
    .select({ filterByFormula: `{portal_access} = 1`, fields: ["email", "first_name", "last_name"] })
    .all();
  const conAccesoIds = new Set(conAcceso.map((r) => r.id));
  console.log(`Founders con portal_access=true: ${conAcceso.length}`);

  // Cruce
  const titularesConAcceso = [...titularIds].filter((id) => conAccesoIds.has(id));
  const titularesSinAcceso = [...titularIds].filter((id) => !conAccesoIds.has(id));
  const conAccesoNoTitular = [...conAccesoIds].filter((id) => !titularIds.has(id));

  console.log(`\n=== CRUCE ===`);
  console.log(`Titulares con acceso (van a recibir): ${titularesConAcceso.length}`);
  console.log(`Titulares SIN acceso (faltarian): ${titularesSinAcceso.length}`);
  console.log(`Con acceso pero NO titulares (extras, podrian ser cofounders prendidos por error): ${conAccesoNoTitular.length}`);

  // Detalle
  if (titularesSinAcceso.length) {
    console.log(`\n--- Titulares SIN acceso ---`);
    for (const id of titularesSinAcceso) {
      const r = await base("Founders MF26").find(id).catch(() => null);
      if (r) console.log(`  ${(r.fields as any).email} | ${(r.fields as any).first_name} ${(r.fields as any).last_name}`);
    }
  }
  if (conAccesoNoTitular.length) {
    console.log(`\n--- Con acceso pero NO titulares (EXTRAS) ---`);
    for (const id of conAccesoNoTitular) {
      const r = conAcceso.find((x) => x.id === id);
      if (r) console.log(`  ${(r.fields as any).email} | ${(r.fields as any).first_name} ${(r.fields as any).last_name}`);
    }
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

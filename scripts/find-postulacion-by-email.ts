/**
 * Busca la(s) postulacion(es) linkeadas a un email desde Founders MF26 y
 * muestra su status, para diagnosticar por que un usuario recibe 403.
 *
 * Uso: npx tsx scripts/find-postulacion-by-email.ts neumang+mf@gmail.com
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const POSTULACIONES = "tblqj2eJMHpEqLxqv";
const FOUNDERS = "tblTif15ehnRN4K74";

const emailArg = process.argv[2];
if (!emailArg) {
  console.error("Uso: npx tsx scripts/find-postulacion-by-email.ts <email>");
  process.exit(1);
}
const email = emailArg.toLowerCase();

async function main() {
  // 1. Buscar founder por email
  console.log(`Buscando founders con email: ${email}`);
  const founderRes = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${FOUNDERS}?filterByFormula=${encodeURIComponent(
      `LOWER({email})="${email}"`,
    )}`,
    { headers: { Authorization: `Bearer ${PAT}` } },
  );
  const founderData = await founderRes.json();
  const founders = founderData.records ?? [];
  console.log(`\n${founders.length} founder(s) encontrado(s):`);
  for (const f of founders) {
    console.log(`  - ${f.id}: ${f.fields.first_name} ${f.fields.last_name} (portal_access=${f.fields.portal_access ? "SI" : "NO"})`);
    console.log(`    postulaciones linkeadas: ${JSON.stringify(f.fields.postulacion_record ?? [])}`);
    console.log(`    startups linkeadas: ${JSON.stringify(f.fields.startup_record ?? [])}`);
  }
  console.log();

  // 2. Buscar postulaciones directamente
  console.log(`Buscando postulaciones cuyo founder tenga email: ${email}`);
  // Formula: {email founder} tiene el email (a través del lookup)
  const postRes = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${POSTULACIONES}?filterByFormula=${encodeURIComponent(
      `LOWER({email founder})="${email}"`,
    )}&maxRecords=10`,
    { headers: { Authorization: `Bearer ${PAT}` } },
  );
  const postData = await postRes.json();
  const posts = postData.records ?? [];
  console.log(`\n${posts.length} postulacion(es) encontrada(s):`);
  for (const p of posts) {
    const f = p.fields;
    console.log(`  - ${p.id}: status=${f.status}, test=${f.test ?? false}`);
    console.log(`    startup_record: ${JSON.stringify(f.startup_record ?? [])}`);
    console.log(`    founder_record: ${JSON.stringify(f.founder_record ?? [])}`);
    console.log(`    startup_name: ${f.startup_name}`);
    const validStatus = f.status === "Inscrita" || f.status === "Invitada institucional";
    const hasStartup = Array.isArray(f.startup_record) && f.startup_record.length > 0;
    console.log(`    ⇒ ${validStatus && hasStartup ? "✅ SIRVE para el portal" : "❌ NO sirve"} (status=${f.status}, tiene_startup=${hasStartup})`);
  }

  if (posts.length === 0) {
    console.log(`\n⚠️  No hay postulaciones para ese email. El usuario no puede llenar consignas.`);
    console.log(`   Solucion:`);
    console.log(`   A) Cambiar el status de la postulacion existente a "Inscrita"`);
    console.log(`   B) O usar el admin-mode con ?as=<startupId> despues del fix.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

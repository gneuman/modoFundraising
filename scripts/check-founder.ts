/**
 * Uso: npx tsx scripts/check-founder.ts <recordId>
 *
 * Busca un record en Postulaciones, Founders, Startups por ID
 * y muestra sus fields relevantes. Sirve para diagnosticar por que
 * un usuario no aparece como "Inscrita" en getAllApplications.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;

const POSTULACIONES = "tblqj2eJMHpEqLxqv";
const FOUNDERS = "tblTif15ehnRN4K74";
const STARTUPS = "tblBv45W1M9ZITEpe";

const recordId = process.argv[2];
if (!recordId) {
  console.error("Falta recordId. Uso: npx tsx scripts/check-founder.ts recXXX");
  process.exit(1);
}

async function tryFind(tableId: string, tableName: string) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${tableId}/${recordId}`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  if (!res.ok) {
    console.log(`  ❌ ${tableName}: ${res.status}`);
    return null;
  }
  const data = await res.json();
  console.log(`\n  ✅ Encontrado en ${tableName}`);
  console.log(`     Fields:`, JSON.stringify(data.fields, null, 2));
  return data;
}

async function main() {
  console.log(`Buscando ${recordId} en las 3 tablas...`);
  const post = await tryFind(POSTULACIONES, "Postulaciones MF26");
  const founder = await tryFind(FOUNDERS, "Founders MF26");
  const startup = await tryFind(STARTUPS, "Startups MF26");

  if (post) {
    console.log(`\n--- ANALISIS POSTULACION ---`);
    const f = post.fields;
    console.log(`Status: ${f.status ?? "(sin status)"}`);
    console.log(`Test flag: ${f.test === true ? "TRUE — se EXCLUYE de getAllApplications" : "false o vacio"}`);
    console.log(`Email founder link: ${JSON.stringify(f.founder_record ?? [])}`);
    console.log(`Startup link: ${JSON.stringify(f.startup_record ?? [])}`);
    console.log();
    if (f.status !== "Inscrita" && f.status !== "Invitada institucional") {
      console.log(`⚠️  Esta postulacion NO tiene status "Inscrita" ni "Invitada institucional"`);
      console.log(`   → getAllApplications SI la devuelve, pero el .find() del endpoint la descarta`);
    }
    if (f.test === true) {
      console.log(`⚠️  Esta postulacion tiene test=true → getAllApplications la EXCLUYE completamente`);
    }
    if (!f.startup_record || (f.startup_record as string[]).length === 0) {
      console.log(`⚠️  No hay startup_record linkeado → app.startup_record[0] sera undefined`);
    }
  }

  if (founder) {
    console.log(`\n--- ANALISIS FOUNDER ---`);
    const f = founder.fields;
    console.log(`Email: ${f.email}`);
    console.log(`portal_access: ${f.portal_access === 1 || f.portal_access === true ? "SI" : "NO"}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

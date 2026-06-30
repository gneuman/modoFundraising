// Carga env y reproduce las llamadas del dashboard fuera de Next para aislar
process.env.NODE_ENV = 'development';
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
env.split(/\r?\n/).forEach(line => {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
});
const Airtable = require('airtable');
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID);
const Tables = {
  POSTULACIONES: "Postulaciones MF26",
  CLASES: "Clases MF26",
  MISIONES: "Misiones MF26",
  ASISTENCIAS: "Asistencias MF26",
  MISIONES_COMPLETADAS: "Misiones Completadas MF26",
  STARTUPS: "Startups MF26",
  FOUNDERS: "Founders MF26",
};

async function probe(label, fn) {
  try {
    const r = await fn();
    console.log(`OK   ${label}  count=${r.length}`);
  } catch (e) {
    console.log(`FAIL ${label}  ${e.statusCode || ''} ${e.error || ''} ${e.message}`);
  }
}

(async () => {
  await probe("Postulaciones .all()", () => base(Tables.POSTULACIONES).select().all());
  await probe("Clases .all()",        () => base(Tables.CLASES).select({ fields: ["titulo"] }).all());
  await probe("Misiones .all()",      () => base(Tables.MISIONES).select({ fields: ["titulo"] }).all());
  await probe("Asistencias .all()",   () => base(Tables.ASISTENCIAS).select().all());
  await probe("MisionesComp .all()",  () => base(Tables.MISIONES_COMPLETADAS).select().all());
  await probe("Startups .all()",      () => base(Tables.STARTUPS).select().all());
  await probe("Founders .all()",      () => base(Tables.FOUNDERS).select().all());
})();

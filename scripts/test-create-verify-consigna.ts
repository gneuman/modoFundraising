/**
 * Test: crea una consigna y la vuelve a leer.
 * Si el create devuelve 200 pero luego GET del ID devuelve 404 → hay rollback silencioso
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const CONSIGNAS = "tbliTlMl0dfbh3HWc";
const STARTUP_ID = "recUAe9bkyV03eIWH";
const TAREA_ID = "recnDnyC4cxyLkiMe";

async function main() {
  const now = new Date().toISOString();
  const fields = {
    id_consigna: `TEST-${Date.now()}`,
    startup_record: [STARTUP_ID],
    tarea: [TAREA_ID],
    contenido_texto: `test create+verify ${now}`,
    founder_que_envio: "test@gnb.mx",
    enviada_at: now,
    actualizada_at: now,
  };

  console.log("Creando consigna...");
  const createRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  console.log(`  Status: ${createRes.status}`);
  const createBody = await createRes.text();
  console.log(`  Body: ${createBody.slice(0, 400)}`);

  if (!createRes.ok) return;

  const created = JSON.parse(createBody);
  const id = created.id;
  console.log(`\nCreated ID: ${id}`);

  // Esperar 1 seg
  await new Promise((r) => setTimeout(r, 1000));

  console.log("\nGET del ID recién creado...");
  const getRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}/${id}`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  console.log(`  Status: ${getRes.status}`);
  const getBody = await getRes.text();
  console.log(`  Body: ${getBody.slice(0, 400)}`);

  console.log("\nLIST todos los records de la tabla...");
  const listRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}?maxRecords=10`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const listData = await listRes.json();
  console.log(`  Total: ${(listData.records ?? []).length}`);
  for (const r of listData.records ?? []) {
    console.log(`  - ${r.id} | id_consigna=${r.fields.id_consigna} | texto=${(r.fields.contenido_texto ?? "").slice(0, 40)}`);
  }
}
main().catch(console.error);

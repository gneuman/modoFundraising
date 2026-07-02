/**
 * Simula EXACTAMENTE lo que hace el endpoint POST /api/portal/consignas
 * pero directo contra Airtable. Si esto funciona, el bug esta en el endpoint
 * o en la comunicacion cliente-servidor. Si esto falla, el bug esta en la
 * logica de upsertConsigna.
 *
 * Uso: npx tsx scripts/test-upsert-consigna.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const CONSIGNAS = "tbliTlMl0dfbh3HWc";

const STARTUP_ID = "recUAe9bkyV03eIWH"; // Modo Foco - Test
const TAREA_ID = "recnDnyC4cxyLkiMe"; // Blurb (4 versiones)

async function main() {
  // 1. Buscar consigna existente por (startup, tarea)
  console.log("1. Buscando consigna existente...");
  const formula = `AND(SEARCH("${STARTUP_ID}", ARRAYJOIN({startup_record})), SEARCH("${TAREA_ID}", ARRAYJOIN({tarea})))`;
  const searchRes = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`,
    { headers: { Authorization: `Bearer ${PAT}` } },
  );
  console.log(`   Status: ${searchRes.status}`);
  const searchData = await searchRes.json();
  console.log(`   Records encontrados: ${(searchData.records ?? []).length}`);
  const existing = searchData.records?.[0];

  // 2. Crear o update
  const now = new Date().toISOString();
  const fields = {
    id_consigna: `${STARTUP_ID}-${TAREA_ID}`,
    startup_record: [STARTUP_ID],
    tarea: [TAREA_ID],
    contenido_texto: `test end-to-end desde script ${now}`,
    url_extra: "https://example.com/mi-blurb",
    founder_que_envio: "test-script@gnb.mx",
    actualizada_at: now,
  } as Record<string, unknown>;

  if (existing) {
    console.log(`\n2. UPDATE ${existing.id}...`);
    const updateRes = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}/${existing.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${PAT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      },
    );
    console.log(`   Status: ${updateRes.status}`);
    const body = await updateRes.text();
    console.log(`   Response: ${body.slice(0, 300)}`);
  } else {
    console.log(`\n2. CREATE nueva consigna...`);
    fields.enviada_at = now;
    const createRes = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      },
    );
    console.log(`   Status: ${createRes.status}`);
    const body = await createRes.text();
    console.log(`   Response: ${body.slice(0, 400)}`);
  }

  // 3. Verificar
  console.log(`\n3. Verificando consignas actuales de esta startup...`);
  const listRes = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}?filterByFormula=${encodeURIComponent(
      `SEARCH("${STARTUP_ID}", ARRAYJOIN({startup_record}))`,
    )}`,
    { headers: { Authorization: `Bearer ${PAT}` } },
  );
  const listData = await listRes.json();
  console.log(`   Total: ${(listData.records ?? []).length}`);
  for (const r of listData.records ?? []) {
    console.log(`   - ${r.id} | tarea=${JSON.stringify(r.fields.tarea)} | texto=${(r.fields.contenido_texto ?? "").slice(0, 40)}`);
  }
}
main().catch(console.error);

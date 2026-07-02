/**
 * Test end-to-end del upload de adjunto a Consignas MF26.
 * 1) Crea una consigna de prueba
 * 2) Sube un archivo pequeño
 * 3) Verifica que aparece
 * 4) Borra la consigna de prueba
 *
 * Uso: npx tsx scripts/test-upload-consigna.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const CONSIGNAS = "tbliTlMl0dfbh3HWc";
const STARTUP_ID = "recUAe9bkyV03eIWH"; // Modo Foco - Test
const TAREA_ID = "recnDnyC4cxyLkiMe"; // Blurb (4 versiones)

async function main() {
  console.log("1. Creando consigna de prueba...");
  const createRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        id_consigna: `TEST-${STARTUP_ID}-${TAREA_ID}`,
        startup_record: [STARTUP_ID],
        tarea: [TAREA_ID],
        contenido_texto: "test de upload desde script",
        founder_que_envio: "test-script@gnb.mx",
        enviada_at: new Date().toISOString(),
        actualizada_at: new Date().toISOString(),
      },
    }),
  });
  if (!createRes.ok) {
    console.error(`❌ Falla crear: ${createRes.status}`, await createRes.text());
    process.exit(1);
  }
  const created = await createRes.json();
  const consignaId = created.id;
  console.log(`   ✅ Consigna creada: ${consignaId}`);

  console.log("\n2. Subiendo archivo de prueba (texto small)...");
  const fileContent = "Hola desde el script test!";
  const base64 = Buffer.from(fileContent).toString("base64");
  const uploadUrl = `https://content.airtable.com/v0/${BASE_ID}/${consignaId}/adjuntos/uploadAttachment`;
  console.log(`   URL: ${uploadUrl}`);
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      contentType: "text/plain",
      filename: "test.txt",
      file: base64,
    }),
  });
  console.log(`   Status: ${uploadRes.status}`);
  const uploadBody = await uploadRes.text();
  console.log(`   Response body: ${uploadBody.slice(0, 500)}`);

  if (!uploadRes.ok) {
    console.error(`\n❌ El upload FALLÓ. Este es el bug real.`);
    console.log(`\n3. Limpiando consigna de prueba...`);
    await fetch(`https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}/${consignaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${PAT}` },
    });
    process.exit(1);
  }

  console.log(`\n   ✅ Upload OK`);

  console.log("\n3. Verificando el record post-upload...");
  const getRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}/${consignaId}`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const data = await getRes.json();
  console.log(`   adjuntos: ${JSON.stringify(data.fields.adjuntos)}`);

  console.log("\n4. Limpiando consigna de prueba...");
  await fetch(`https://api.airtable.com/v0/${BASE_ID}/${CONSIGNAS}/${consignaId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${PAT}` },
  });
  console.log(`   ✅ Borrado`);
}
main().catch(console.error);

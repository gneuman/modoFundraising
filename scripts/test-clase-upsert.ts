/**
 * Test end-to-end del webhook clase-upsert sin invitar a todos los Founders.
 *
 * Flujo:
 *   1. Crea una clase TEST en Airtable (Clases MF26) con calendar_event_id vacío.
 *   2. Llama al endpoint /api/airtable/clase-upsert pasando testEmail.
 *   3. El endpoint crea el evento Founders + Equipo invitando SOLO a testEmail.
 *   4. Imprime los IDs por consola para que el script de cleanup los pueda borrar.
 *
 * Uso:
 *   npx tsx scripts/test-clase-upsert.ts                                  # imprime ayuda
 *   npx tsx scripts/test-clase-upsert.ts --apply                          # contra prod, invita neumang@gmail.com
 *   npx tsx scripts/test-clase-upsert.ts --apply --email=otro@x.com       # invita a otro email
 *   npx tsx scripts/test-clase-upsert.ts --apply --local                  # contra http://localhost:3000
 *
 * Después de validar, correr:
 *   npx tsx scripts/cleanup-clase-test.ts --apply --recordId=<el id que imprimió este script>
 */
import Airtable from "airtable";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const LOCAL = process.argv.includes("--local");
const emailArg = process.argv.find((a) => a.startsWith("--email="));
const TEST_EMAIL = emailArg ? emailArg.split("=")[1] : "neumang@gmail.com";

const SECRET = process.env.AIRTABLE_WEBHOOK_SECRET;
const BASE_URL = LOCAL
  ? "http://localhost:3000"
  : "https://portal.modofundraising.com";

const CLASES_TABLE_ID = "tblHRJ35xMM3rQa85";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

function help() {
  console.log("Uso:");
  console.log("  npx tsx scripts/test-clase-upsert.ts --apply");
  console.log("  npx tsx scripts/test-clase-upsert.ts --apply --email=otro@x.com");
  console.log("  npx tsx scripts/test-clase-upsert.ts --apply --local");
  console.log("");
  console.log("Crea una clase TEST aislada en Airtable y dispara el upsert");
  console.log("invitando SOLO al email pasado. Default: neumang@gmail.com");
}

async function main() {
  if (!APPLY) {
    help();
    console.log("\n(corré con --apply para ejecutar)");
    return;
  }
  if (!SECRET) {
    console.error("❌ Falta AIRTABLE_WEBHOOK_SECRET en .env.local");
    process.exit(1);
  }

  console.log("─".repeat(60));
  console.log("TEST clase-upsert");
  console.log(`Endpoint: ${BASE_URL}/api/airtable/clase-upsert`);
  console.log(`testEmail: ${TEST_EMAIL}`);
  console.log("─".repeat(60));

  // ─── 1. Crear clase TEST en Airtable ──────────────────────────────────────
  const ahora = new Date();
  const enUnaHora = new Date(ahora.getTime() + 60 * 60 * 1000);
  const fechaIso = enUnaHora.toISOString();
  const titulo = `TEST webhook clase-upsert ${ahora.toISOString().slice(0, 16)}`;

  console.log(`\n1. Creando clase TEST en Airtable...`);
  console.log(`   titulo: ${titulo}`);
  console.log(`   fecha:  ${fechaIso}`);

  // Creamos con listo_publicar = true para que el endpoint pase el gate.
  //
  // ⚠️ Si tenés la Automation de Airtable PRENDIDA (trigger listo_publicar =
  // checked), este create la dispara y vas a tener eventos duplicados
  // (2 desde Automation + 2 desde el fetch de abajo). APAGÁ la Automation
  // antes de correr este script, o usá --skip-fetch para dejar que la
  // Automation sea la única que dispare.
  const created = (await base(CLASES_TABLE_ID).create({
    titulo,
    fecha: fechaIso,
    descripcion: "TEST — clase de prueba del webhook. Borrar después.",
    duracion_minutos: 30,
    listo_publicar: true,
  } as never)) as unknown as { id: string };

  const recordId = created.id;
  console.log(`   ✅ Record creado: ${recordId}`);

  // ─── 2. Llamar al endpoint ────────────────────────────────────────────────
  console.log(`\n2. POST ${BASE_URL}/api/airtable/clase-upsert`);
  const res = await fetch(`${BASE_URL}/api/airtable/clase-upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: SECRET,
      recordId,
      testEmail: TEST_EMAIL,
    }),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.error(`   ❌ Respuesta no es JSON (status ${res.status}):`);
    console.error(text.slice(0, 500));
    console.error(`\n⚠️ El record ${recordId} quedó en Airtable. Borrá manual o con cleanup-clase-test.ts`);
    process.exit(1);
  }

  console.log(`   Status: ${res.status}`);
  console.log(`   Body: ${JSON.stringify(json, null, 2)}`);

  // ─── 3. Resumen + instrucciones de cleanup ────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log("CLEANUP — para borrar la clase TEST + sus eventos de Calendar:");
  console.log("");
  console.log(`  npx tsx scripts/cleanup-clase-test.ts --apply --recordId=${recordId}`);
  console.log("─".repeat(60));
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

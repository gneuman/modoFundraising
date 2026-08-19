/**
 * Marca listo_publicar = true en la clase Dataroom & Fundraising by Lazo.
 * Esto dispara el webhook clase-upsert que invita a los 93 founders faltantes.
 * Uso: npx tsx scripts/set-dataroom-publicar.ts
 */
import Airtable from "airtable";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);
const RECORD_ID = "recpEe5vmQ6CSOHsj"; // Masterclass: Dataroom & Fundraising by Lazo
const TABLE = "tblHRJ35xMM3rQa85"; // Clases MF26

async function main() {
  const before = await base(TABLE).find(RECORD_ID);
  console.log("Antes → listo_publicar:", (before.fields as any).listo_publicar);

  await base(TABLE).update([
    { id: RECORD_ID, fields: { listo_publicar: true } },
  ]);

  const after = await base(TABLE).find(RECORD_ID);
  console.log("Después → listo_publicar:", (after.fields as any).listo_publicar);
  console.log("\nOK. El webhook de Airtable debería dispararse ahora.");
  console.log("Espera ~30s y corre: npx tsx scripts/check-dataroom-invites.ts");
}
main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

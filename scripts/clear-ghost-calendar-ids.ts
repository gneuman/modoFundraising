/**
 * Vacia calendar_event_id y calendar_event_id_team en una clase de MF26.
 * Uso cuando borraste manualmente el evento de Calendar y quedaron IDs fantasma
 * en Airtable (que hacen que clase-upsert vaya por UPDATE path y falle con 404).
 *
 * Uso:
 *   npx tsx scripts/clear-ghost-calendar-ids.ts --recordId=recXXXX [--apply]
 *   npx tsx scripts/clear-ghost-calendar-ids.ts --titulo="Masterclass Oracle" [--apply]
 *
 * Dry-run por default. Requiere --apply para escribir.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";

const CLASES_TABLE_ID = "tblHRJ35xMM3rQa85";
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

function argVal(flag: string): string | undefined {
  const a = process.argv.slice(2).find((x) => x.startsWith(`--${flag}=`));
  return a?.slice(flag.length + 3);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const recordId = argVal("recordId");
  const tituloQ = argVal("titulo");

  if (!recordId && !tituloQ) {
    console.error("Falta --recordId=recXXX o --titulo='Masterclass Oracle'");
    process.exit(1);
  }

  let matches: { id: string; titulo?: string; foundersId?: string; teamId?: string }[] = [];

  if (recordId) {
    const r = await base(CLASES_TABLE_ID).find(recordId);
    const f = r.fields as any;
    matches = [{ id: r.id, titulo: f.titulo, foundersId: f.calendar_event_id, teamId: f.calendar_event_id_team }];
  } else if (tituloQ) {
    const records = await base(CLASES_TABLE_ID)
      .select({ fields: ["titulo", "calendar_event_id", "calendar_event_id_team"] })
      .all();
    const q = tituloQ.toLowerCase();
    matches = records
      .filter((r) => ((r.fields as any).titulo as string ?? "").toLowerCase().includes(q))
      .map((r) => {
        const f = r.fields as any;
        return { id: r.id, titulo: f.titulo, foundersId: f.calendar_event_id, teamId: f.calendar_event_id_team };
      });
  }

  if (!matches.length) {
    console.log("No se encontro ninguna clase con ese criterio.");
    return;
  }

  console.log(`\n[clear-ghost] matches: ${matches.length}  mode=${apply ? "APPLY" : "DRY-RUN"}\n`);
  for (const m of matches) {
    console.log(`▸ ${m.titulo}  (${m.id})`);
    console.log(`  calendar_event_id:      ${m.foundersId ?? "(ya vacio)"}`);
    console.log(`  calendar_event_id_team: ${m.teamId ?? "(ya vacio)"}`);
  }

  if (!apply) {
    console.log(`\nDry-run OK. Para aplicar: agrega --apply`);
    return;
  }

  for (const m of matches) {
    await base(CLASES_TABLE_ID).update(m.id, {
      calendar_event_id: "",
      calendar_event_id_team: "",
    });
    console.log(`  OK cleared: ${m.titulo}`);
  }
  console.log(`\nListo. Ahora marca listo_publicar=true en Airtable para regenerar.`);
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

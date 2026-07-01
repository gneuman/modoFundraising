/**
 * Chequea cuantas clases MF26 tienen calendar_event_id y calendar_event_id_team.
 * Uso table ID (no nombre) porque el PAT esta restringido por scope.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";

const CLASES_TABLE_ID = "tblHRJ35xMM3rQa85";
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

async function main() {
  const records = await base(CLASES_TABLE_ID)
    .select({ fields: ["titulo", "fecha", "calendar_event_id", "calendar_event_id_team", "listo_publicar"] })
    .all();

  console.log(`\nTotal clases MF26: ${records.length}\n`);

  let conFoundersEvent = 0;
  let conTeamEvent = 0;
  const sample: { titulo: string; foundersId?: string; teamId?: string; listoPub?: boolean }[] = [];

  for (const r of records) {
    const f = r.fields as any;
    const foundersId = f.calendar_event_id as string | undefined;
    const teamId = f.calendar_event_id_team as string | undefined;
    if (foundersId) conFoundersEvent++;
    if (teamId) conTeamEvent++;
    sample.push({ titulo: f.titulo, foundersId, teamId, listoPub: !!f.listo_publicar });
  }

  console.log(`- Con calendar_event_id (founders): ${conFoundersEvent}/${records.length}`);
  console.log(`- Con calendar_event_id_team:       ${conTeamEvent}/${records.length}`);
  console.log(`\nPrimeras 8 clases:`);
  for (const s of sample.slice(0, 8)) {
    console.log(`  ▸ ${s.titulo}`);
    console.log(`    founders: ${s.foundersId ?? "(vacio)"}`);
    console.log(`    team:     ${s.teamId ?? "(vacio)"}`);
    console.log(`    listo:    ${s.listoPub}`);
  }
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1); });

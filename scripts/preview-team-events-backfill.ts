/**
 * Preview: lista clases MF26 candidatas a crear/actualizar evento Team.
 *
 * Regla:
 *   - Incluye clases con fecha en el futuro.
 *   - EXCLUYE prefix S1 y S2 (ya pasaron, no queremos ruido).
 *   - Muestra si necesita CREATE (sin calendar_event_id_team) o INVITE (ya tiene).
 *
 * Uso: npx tsx scripts/preview-team-events-backfill.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";

const CLASES_TABLE_ID = "tblHRJ35xMM3rQa85";
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

const TEAM_INVITEES = ["admin@impacta.vc", "hola@impacta.vc", "nmacchiavello@impacta.vc"];

function prefix(titulo: string): string {
  return titulo.split(/[\s—-]/)[0].toUpperCase();
}

async function main() {
  const now = new Date();
  const records = await base(CLASES_TABLE_ID)
    .select({
      fields: [
        "titulo",
        "fecha",
        "url_live_team",
        "calendar_event_id",
        "calendar_event_id_team",
      ],
      sort: [{ field: "fecha" }],
    })
    .all();

  const rows = records.map((r) => {
    const f = r.fields as any;
    return {
      id: r.id,
      titulo: (f.titulo as string) ?? "",
      fecha: f.fecha as string | undefined,
      urlLiveTeam: f.url_live_team as string | undefined,
      foundersId: f.calendar_event_id as string | undefined,
      teamId: f.calendar_event_id_team as string | undefined,
    };
  });

  const candidatas = rows.filter((r) => {
    if (!r.fecha) return false;
    const p = prefix(r.titulo);
    if (p === "S1" || p === "S2") return false;
    return new Date(r.fecha) > now;
  });

  const toCreate = candidatas.filter((r) => !r.teamId);
  const toInvite = candidatas.filter((r) => r.teamId);

  console.log(`\n[preview] total clases MF26: ${rows.length}`);
  console.log(`[preview] futuras (excl S1/S2): ${candidatas.length}`);
  console.log(`[preview] a CREAR evento Team:  ${toCreate.length}`);
  console.log(`[preview] a INVITAR (ya existe): ${toInvite.length}`);
  console.log(`[preview] invitees fijos: ${TEAM_INVITEES.join(", ")}\n`);

  console.log(`── A CREAR ──────────────────────────────────`);
  for (const r of toCreate) {
    console.log(`  ▸ [${prefix(r.titulo)}] ${r.titulo}`);
    console.log(`    fecha:         ${r.fecha}`);
    console.log(`    url_live_team: ${r.urlLiveTeam ?? "(vacio)"}`);
  }

  console.log(`\n── A INVITAR (ya tienen team event) ───────────`);
  for (const r of toInvite) {
    console.log(`  ▸ [${prefix(r.titulo)}] ${r.titulo}  → eventId ${r.teamId}`);
  }

  console.log(`\nDry-run OK. Para aplicar: npx tsx scripts/backfill-team-events.ts --apply`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

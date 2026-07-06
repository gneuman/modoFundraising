/**
 * Limpieza de asistencias duplicadas (WI-1820).
 *
 * Antes del fix de lock/clave-natural en upsertAsistencia, una race condition
 * (doble clic, dos flujos en paralelo, retries) podía crear >1 registro de
 * asistencia para la misma (startup, clase). Este script deja como máximo 1.
 *
 * Agrupa por clave natural. Preferimos id_asistencia ("<startupId>-<claseId>");
 * si algún registro viejo no lo tiene poblado, caemos al par de link fields.
 *
 * Regla de conservación por grupo (en orden):
 *   1) el que tenga asistio = true (asistió realmente),
 *   2) entre esos, el más antiguo (createdTime) — el "original".
 * El resto se elimina.
 *
 * READ-ONLY por defecto (dry-run). Para borrar:
 *   npx tsx scripts/dedupe-asistencias.ts --apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";

const APPLY = process.argv.includes("--apply");

const ASISTENCIAS_TABLE = "tblfauyUdGIT1xVBn"; // Asistencias MF26 (Tables.ASISTENCIAS)

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

type Row = {
  id: string;
  createdTime: string;
  idAsistencia: string | null;
  startupId: string | null;
  claseId: string | null;
  asistio: boolean;
};

function groupKey(r: Row): string | null {
  if (r.idAsistencia) return r.idAsistencia;
  if (r.startupId && r.claseId) return `${r.startupId}-${r.claseId}`;
  return null; // no se puede agrupar con confianza → se deja intacto
}

async function main() {
  console.log(
    `\n🧹 Dedupe asistencias — ${APPLY ? "APPLY (borra)" : "DRY-RUN (no borra)"}\n`,
  );

  const records = await base(ASISTENCIAS_TABLE).select().all();

  const rows: Row[] = records.map((r) => {
    const f = r.fields as Record<string, unknown>;
    const startup = f.startup_record as string[] | undefined;
    const clase = f.clase_record as string[] | undefined;
    return {
      id: r.id,
      createdTime: (r as unknown as { _rawJson: { createdTime: string } })._rawJson.createdTime,
      idAsistencia: (f.id_asistencia as string) ?? null,
      startupId: startup?.[0] ?? null,
      claseId: clase?.[0] ?? null,
      asistio: f.asistio === true,
    };
  });

  console.log(`Total registros de asistencia: ${rows.length}`);

  const groups = new Map<string, Row[]>();
  let sinClave = 0;
  for (const row of rows) {
    const key = groupKey(row);
    if (!key) {
      sinClave++;
      continue;
    }
    const arr = groups.get(key) ?? [];
    arr.push(row);
    groups.set(key, arr);
  }
  if (sinClave) console.log(`⚠️  ${sinClave} registros sin clave agrupable — se dejan intactos.`);

  const dupGroups = [...groups.entries()].filter(([, arr]) => arr.length > 1);
  console.log(`\nGrupos con duplicados (>1 registro): ${dupGroups.length}`);

  const toDelete: Row[] = [];
  for (const [key, arr] of dupGroups) {
    // Elegir el que se conserva: asistio=true primero, luego el más antiguo.
    const sorted = [...arr].sort((a, b) => {
      if (a.asistio !== b.asistio) return a.asistio ? -1 : 1;
      return a.createdTime.localeCompare(b.createdTime);
    });
    const keep = sorted[0];
    const drop = sorted.slice(1);
    toDelete.push(...drop);
    console.log(
      `   ${key}  (${arr.length} regs) → conservar ${keep.id} [asistio=${keep.asistio}], borrar ${drop.length}`,
    );
  }

  console.log(`\nTotal a borrar: ${toDelete.length}`);

  if (!APPLY) {
    console.log(`\n(DRY-RUN) No se borró nada. Corre con --apply para eliminar.\n`);
    return;
  }

  // Airtable destroy acepta hasta 10 IDs por llamada.
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 10) {
    const batch = toDelete.slice(i, i + 10).map((r) => r.id);
    await base(ASISTENCIAS_TABLE).destroy(batch);
    deleted += batch.length;
  }
  console.log(`\n✅ Borrados ${deleted}/${toDelete.length} duplicados.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

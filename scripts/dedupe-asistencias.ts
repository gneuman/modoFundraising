/**
 * Limpieza + reparación de asistencias (WI-1820).
 *
 * Contexto (auditado 2026-07-06 con datos reales de MF26):
 *  - 89 de 90 records traen id_asistencia = UUID aleatorio, no la clave natural
 *    "<startupId>-<claseId>". Los creó un flujo externo (import inicial / n8n),
 *    NO nuestro createAsistencia. Por eso el upsert por clave natural nunca
 *    matcheaba y el dedupe viejo (agrupando por id_asistencia) reportaba 0.
 *  - Algunos records perdieron el link clase_record pero conservan el nombre de la
 *    clase en `notas` (ej. "MF26 #1 Program Launch", "MF26 #2 Rockstar...").
 *  - Otros perdieron el link startup_record por completo (huérfanos: no se pueden
 *    atribuir a ninguna startup).
 *
 * Este script hace 3 cosas, agrupando SIEMPRE por la (startup, clase) real de los
 * link fields (con clase recuperada desde `notas` cuando falta el link):
 *
 *  1) REPARAR: a los records con startup pero sin clase_record, les infiere la clase
 *     desde `notas` y reescribe el link (solo si logra mapear la clase con confianza).
 *  2) DEDUPLICAR: por (startup, clase) deja como máximo 1 record.
 *       Conservación: asistio=true primero, luego el más antiguo (createdTime).
 *  3) BORRAR HUÉRFANOS: records sin startup_record (no cuentan para nadie).
 *
 * READ-ONLY por defecto (dry-run). Para aplicar cambios:
 *   npx tsx scripts/dedupe-asistencias.ts --apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Airtable from "airtable";

const APPLY = process.argv.includes("--apply");

const ASISTENCIAS_TABLE = "tblfauyUdGIT1xVBn"; // Asistencias MF26 (Tables.ASISTENCIAS)
const CLASES_TABLE = "tblHRJ35xMM3rQa85"; // Clases MF26

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

type Row = {
  id: string;
  createdTime: string;
  startupId: string | null;
  claseId: string | null; // del link real
  resolvedClaseId: string | null; // link real, o inferido desde notas
  needsClaseLink: boolean; // true si claseId venía vacío pero lo inferimos
  asistio: boolean;
  notas: string;
};

// Infiere el claseId desde el texto de `notas`. Solo mapea las clases que
// aparecen en los records dañados (arranque del programa). Devuelve null si no
// se puede mapear con confianza → el record NO se toca (se reporta y se deja).
function claseFromNotas(notas: string): string | null {
  const n = notas.toLowerCase();
  if (n.includes("#1") || n.includes("program launch")) return "recxv5VWl5qoT74E5";
  if (n.includes("#2") || n.includes("rockstar")) return "recY1PBsyfNR8irL8";
  return null;
}

async function main() {
  console.log(
    `\n🧹 Dedupe + reparación de asistencias — ${APPLY ? "APPLY (modifica)" : "DRY-RUN (no modifica)"}\n`,
  );

  const records = await base(ASISTENCIAS_TABLE).select().all();

  const rows: Row[] = records.map((r) => {
    const f = r.fields as Record<string, unknown>;
    const startup = f.startup_record as string[] | undefined;
    const clase = f.clase_record as string[] | undefined;
    const claseId = clase?.[0] ?? null;
    const notas = (f.notas as string) ?? "";
    const inferred = claseId ?? claseFromNotas(notas);
    return {
      id: r.id,
      createdTime: (r as unknown as { _rawJson: { createdTime: string } })._rawJson.createdTime,
      startupId: startup?.[0] ?? null,
      claseId,
      resolvedClaseId: inferred,
      needsClaseLink: !claseId && !!inferred,
      asistio: f.asistio === true,
      notas,
    };
  });

  console.log(`Total registros: ${rows.length}`);

  const orphans: Row[] = []; // sin startup → borrar
  const unresolvable: Row[] = []; // con startup pero sin clase y sin poder inferirla → dejar intacto
  const groups = new Map<string, Row[]>();

  for (const row of rows) {
    if (!row.startupId) {
      orphans.push(row);
      continue;
    }
    if (!row.resolvedClaseId) {
      unresolvable.push(row);
      continue;
    }
    const key = `${row.startupId}-${row.resolvedClaseId}`;
    const arr = groups.get(key) ?? [];
    arr.push(row);
    groups.set(key, arr);
  }

  console.log(`  Huérfanos sin startup (se BORRAN): ${orphans.length}`);
  if (unresolvable.length)
    console.log(`  ⚠️  Con startup pero sin clase resoluble (se DEJAN intactos): ${unresolvable.length}`);

  // 1) REPARAR links de clase faltantes.
  const toRepair = rows.filter((r) => r.startupId && r.needsClaseLink);
  console.log(`\n1) Reparar link de clase (inferido desde notas): ${toRepair.length}`);
  for (const r of toRepair) {
    console.log(`   ${r.id} → clase ${r.resolvedClaseId}  (notas: "${r.notas.slice(0, 40)}")`);
  }

  // 2) DEDUP por (startup, clase resuelta).
  const dupGroups = [...groups.entries()].filter(([, arr]) => arr.length > 1);
  console.log(`\n2) Grupos (startup,clase) con duplicados: ${dupGroups.length}`);
  const toDelete: Row[] = [];
  for (const [key, arr] of dupGroups) {
    const sorted = [...arr].sort((a, b) => {
      if (a.asistio !== b.asistio) return a.asistio ? -1 : 1;
      return a.createdTime.localeCompare(b.createdTime);
    });
    const keep = sorted[0];
    const drop = sorted.slice(1);
    toDelete.push(...drop);
    console.log(
      `   ${key} (${arr.length} regs) → conservar ${keep.id}, borrar ${drop.map((d) => d.id).join(", ")}`,
    );
  }

  // 3) HUÉRFANOS al borrado.
  toDelete.push(...orphans);

  console.log(`\n3) Total a borrar: ${toDelete.length} (${toDelete.length - orphans.length} duplicados + ${orphans.length} huérfanos)`);

  if (!APPLY) {
    console.log(`\n(DRY-RUN) No se modificó nada. Corre con --apply para aplicar.\n`);
    return;
  }

  // Reparar links (solo records que NO van a borrarse).
  const deleteIds = new Set(toDelete.map((r) => r.id));
  let repaired = 0;
  for (const r of toRepair) {
    if (deleteIds.has(r.id)) continue; // si es un duplicado que se borra, no vale la pena reparar
    await base(ASISTENCIAS_TABLE).update(r.id, {
      clase_record: [r.resolvedClaseId!],
    } as never);
    repaired++;
  }
  console.log(`\n✅ Reparados ${repaired} links de clase.`);

  // Borrar (destroy acepta hasta 10 IDs por llamada).
  let deleted = 0;
  const ids = [...deleteIds];
  for (let i = 0; i < ids.length; i += 10) {
    await base(ASISTENCIAS_TABLE).destroy(ids.slice(i, i + 10));
    deleted += Math.min(10, ids.length - i);
  }
  console.log(`✅ Borrados ${deleted} records (duplicados + huérfanos).\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Reconciliación de asistencias en vivo importadas por Zapier (WI-* asistencias).
 *
 * PROBLEMA: el Zap de asistencia de sesión en vivo crea registros en "Asistencias
 * MF26" con la fecha y la startup, pero NO liga `clase_record` (deja la clase solo
 * como texto en `notas`). El dashboard (getEmpresasStats) y el portal solo cuentan
 * asistencias con `clase_record`, así que esos registros quedan invisibles → clases
 * en vivo aparecen con "2 o 3 asistentes" cuando en realidad fueron decenas.
 *
 * Este script liga cada huérfano a su clase real:
 *   - Match principal: fecha del registro == fecha de la clase (1 clase por fecha).
 *   - Verificación: el título del webinar en `notas` coincide con el título de la clase.
 * Todo es POR STARTUP (el modelo de asistencia es por startup, no por founder).
 *
 * DEDUP: si ya existe otro registro para la misma (startup, clase) — típicamente uno
 * del portal por ver la grabación — no se crea duplicado. Se conserva UNO (asistio=true,
 * el más antiguo) y se borra el sobrante. Misma regla que dedupe-asistencias.ts.
 *
 * Los huérfanos SIN startup vinculada NO se pueden ligar a una empresa y se dejan
 * intactos (se listan al final para revisión manual).
 *
 * READ-ONLY por defecto (dry-run). Para aplicar:
 *   npx tsx scripts/reconcilia-asistencias-live.ts --apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import Airtable from "airtable";

const APPLY = process.argv.includes("--apply");

const CLASES = "tblHRJ35xMM3rQa85"; // Clases MF26
const ASISTENCIAS = "tblfauyUdGIT1xVBn"; // Asistencias MF26

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function keywords(s: string): Set<string> {
  const stop = new Set([
    "clase", "mf26", "para", "por", "session", "sesion", "startups",
    "the", "con", "las", "los",
  ]);
  return new Set(norm(s).split(" ").filter((w) => w.length > 3 && !stop.has(w)));
}
function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

type Row = {
  id: string;
  createdTime: string;
  startupId: string | null;
  claseId: string | null; // ya ligada, si la tiene
  asistio: boolean;
  fecha: string;
  notas: string;
};

async function main() {
  console.log(
    `\n🔗 Reconciliar asistencias live — ${APPLY ? "APPLY (escribe)" : "DRY-RUN (no escribe)"}\n`,
  );

  const [claseRecs, asisRecs] = await Promise.all([
    base(CLASES).select().all(),
    base(ASISTENCIAS).select().all(),
  ]);

  type Clase = { id: string; titulo: string; fecha: string; kw: Set<string> };
  const clases: Clase[] = claseRecs.map((r) => {
    const f = r.fields as Record<string, unknown>;
    const titulo = (f.titulo as string) ?? "";
    return {
      id: r.id,
      titulo,
      fecha: ((f.fecha as string) ?? "").slice(0, 10),
      kw: keywords(titulo),
    };
  });
  const clasesPorFecha = new Map<string, Clase[]>();
  for (const c of clases) {
    if (!c.fecha) continue;
    const arr = clasesPorFecha.get(c.fecha) ?? [];
    arr.push(c);
    clasesPorFecha.set(c.fecha, arr);
  }

  const rows: Row[] = asisRecs.map((r) => {
    const f = r.fields as Record<string, unknown>;
    return {
      id: r.id,
      createdTime: (r as unknown as { _rawJson: { createdTime: string } })._rawJson.createdTime,
      startupId: (f.startup_record as string[] | undefined)?.[0] ?? null,
      claseId: (f.clase_record as string[] | undefined)?.[0] ?? null,
      asistio: f.asistio === true,
      fecha: ((f.fecha as string) ?? "").slice(0, 10),
      notas: (f.notas as string) ?? "",
    };
  });

  // Índice de registros YA ligados por (startup, clase) para detectar duplicados.
  const ligadoPorCombo = new Map<string, Row[]>();
  for (const row of rows) {
    if (row.claseId && row.startupId) {
      const key = `${row.startupId}::${row.claseId}`;
      const arr = ligadoPorCombo.get(key) ?? [];
      arr.push(row);
      ligadoPorCombo.set(key, arr);
    }
  }

  const huerfanos = rows.filter((r) => !r.claseId);
  const sinStartup: Row[] = [];
  const aLigar: { row: Row; clase: Clase; via: string }[] = [];
  const aBorrarPorDup: Row[] = []; // huérfano que colisiona con uno ya ligado

  for (const row of huerfanos) {
    if (!row.startupId) {
      sinStartup.push(row);
      continue;
    }
    const notasKw = keywords(row.notas);
    const porFecha = clasesPorFecha.get(row.fecha) ?? [];

    let match: Clase | null = null;
    let via = "";
    if (porFecha.length === 1) {
      match = porFecha[0];
      via = "fecha única";
    } else if (porFecha.length > 1) {
      const scored = porFecha
        .map((c) => ({ c, score: overlap(notasKw, c.kw) }))
        .sort((a, b) => b.score - a.score);
      if (scored[0].score > (scored[1]?.score ?? -1)) {
        match = scored[0].c;
        via = "fecha+notas";
      }
    } else {
      const scored = clases
        .map((c) => ({ c, score: overlap(notasKw, c.kw) }))
        .sort((a, b) => b.score - a.score);
      if (scored[0].score >= 2 && scored[0].score > (scored[1]?.score ?? -1)) {
        match = scored[0].c;
        via = "solo notas";
      }
    }

    if (!match) {
      console.log(`   ✗ SIN MATCH  startup=${row.startupId} fecha=${row.fecha} notas="${row.notas.slice(0, 40)}"`);
      continue;
    }

    // ¿Ya existe un registro ligado para esta (startup, clase)? → dedup en vez de ligar.
    const combo = `${row.startupId}::${match.id}`;
    const yaLigados = ligadoPorCombo.get(combo) ?? [];
    if (yaLigados.length > 0) {
      // Conservar el ligado existente (ya cuenta). Borrar el huérfano.
      aBorrarPorDup.push(row);
    } else {
      aLigar.push({ row, clase: match, via });
      // Registrar como ligado para que otro huérfano de la misma (startup,clase)
      // en este mismo lote se marque como duplicado en vez de ligarse doble.
      ligadoPorCombo.set(combo, [{ ...row, claseId: match.id }]);
    }
  }

  // Resumen
  const porClase = new Map<string, number>();
  for (const { clase } of aLigar) porClase.set(clase.titulo, (porClase.get(clase.titulo) ?? 0) + 1);

  console.log(`─── RESUMEN ───`);
  console.log(`Huérfanos totales:        ${huerfanos.length}`);
  console.log(`A ligar (nuevo vínculo):  ${aLigar.length}`);
  console.log(`A borrar (dup ya ligado): ${aBorrarPorDup.length}`);
  console.log(`Sin startup (intactos):   ${sinStartup.length}`);
  console.log(`\nVínculos nuevos por clase:`);
  for (const [titulo, n] of porClase) console.log(`   ${String(n).padStart(3)} → ${titulo.trim()}`);

  if (sinStartup.length) {
    console.log(`\n⚠️  Sin startup — requieren revisión manual (fecha | notas):`);
    for (const r of sinStartup) console.log(`   ${r.id}  ${r.fecha}  "${r.notas.slice(0, 55)}"`);
  }

  if (!APPLY) {
    console.log(`\n(DRY-RUN) No se escribió nada. Corre con --apply para aplicar.\n`);
    return;
  }

  // Aplicar: ligar clase_record en los huérfanos.
  let ligados = 0;
  for (let i = 0; i < aLigar.length; i += 10) {
    const batch = aLigar.slice(i, i + 10).map(({ row, clase }) => ({
      id: row.id,
      fields: { clase_record: [clase.id] } as never,
    }));
    await base(ASISTENCIAS).update(batch);
    ligados += batch.length;
  }
  console.log(`\n✅ Ligados ${ligados}/${aLigar.length}.`);

  // Borrar duplicados (huérfanos que ya tenían un registro ligado equivalente).
  let borrados = 0;
  for (let i = 0; i < aBorrarPorDup.length; i += 10) {
    const ids = aBorrarPorDup.slice(i, i + 10).map((r) => r.id);
    if (ids.length) {
      await base(ASISTENCIAS).destroy(ids);
      borrados += ids.length;
    }
  }
  console.log(`🗑️  Borrados ${borrados}/${aBorrarPorDup.length} duplicados.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

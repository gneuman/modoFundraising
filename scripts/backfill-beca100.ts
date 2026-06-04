/**
 * Backfill payment_status="Beca 100%" para las inscritas con beca 100% que
 * quedaron en "Pendiente" (admitidas antes de este cambio).
 *
 * Criterio: status=Inscrita + discount_percent=100 + payment_status NO es cuota pagada.
 *
 * Uso:
 *   npx tsx scripts/backfill-beca100.ts          (dry-run + chequeo del campo)
 *   npx tsx scripts/backfill-beca100.ts --apply  (escribe)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import Airtable from "airtable";

const BASE = process.env.AIRTABLE_BASE_ID!;
const PAT = process.env.AIRTABLE_PAT!;
function base(table: string) {
  return new Airtable({ apiKey: PAT }).base(BASE)(table);
}
const POSTULACIONES = "Postulaciones MF26";
const STARTUPS = "Startups MF26";
const PAGADAS = ["Cuota 1 pagada", "Cuota 2 pagada", "Cuota 3 pagada", "Cuota 4 pagada"];
const APPLY = process.argv.includes("--apply");

async function checkCampo() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const data = await res.json();
  const tabla = data.tables.find((t: { name: string }) => t.name === POSTULACIONES);
  const campo = tabla?.fields.find((f: { name: string }) => f.name === "payment_status");
  console.log(`payment_status: tipo="${campo?.type}"`);
  if (campo?.type === "singleSelect" || campo?.type === "multipleSelects") {
    const opts = (campo.options?.choices ?? []).map((c: { name: string }) => c.name);
    const tiene = opts.includes("Beca 100%");
    console.log(`  opciones: ${JSON.stringify(opts)}`);
    console.log(`  ¿existe opción "Beca 100%"? ${tiene ? "SÍ" : "NO — hay que crearla en Airtable o usar typecast"}`);
    return { isSelect: true, tieneOpcion: tiene };
  }
  return { isSelect: false, tieneOpcion: true };
}

async function main() {
  const campoInfo = await checkCampo();

  const [posts, startups] = await Promise.all([
    base(POSTULACIONES).select().all(),
    base(STARTUPS).select().all(),
  ]);
  const sMap = new Map(startups.map((s) => [s.id, s.fields as Record<string, unknown>]));

  const target = posts.filter((p) => {
    const f = p.fields as Record<string, unknown>;
    return (
      f.status === "Inscrita" &&
      Number(f.discount_percent) === 100 &&
      !PAGADAS.includes(f.payment_status as string) &&
      f.payment_status !== "Beca 100%"
    );
  });

  console.log(`\n${APPLY ? "APPLY" : "DRY-RUN"} — ${target.length} a backfillear a payment_status="Beca 100%"\n`);
  for (const p of target) {
    const f = p.fields as Record<string, unknown>;
    const sid = (f.startup_record as string[])?.[0];
    const name = (sid ? sMap.get(sid)?.startup_name : undefined) as string ?? p.id;
    if (APPLY) {
      await base(POSTULACIONES).update(p.id, { payment_status: "Beca 100%" } as never, { typecast: true });
      console.log(`  ✅ ${name} (era "${f.payment_status}")`);
    } else {
      console.log(`  [dry] ${name} (era "${f.payment_status}")`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

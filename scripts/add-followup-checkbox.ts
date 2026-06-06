/**
 * Crea dos campos formula visuales en Postulaciones MF26 que reflejan
 * si los timestamps de follow-up de admisión están seteados:
 *
 *   follow_up_1_sent_visual = {follow_up_1_sent_at} != BLANK()   → ✓
 *   follow_up_2_sent_visual = {follow_up_2_sent_at} != BLANK()   → ✓
 *
 * Sigue el mismo patrón que add-form-reminder-checkbox.ts.
 *
 * Por qué dos campos en vez de uno: ya existen `follow_up_1_sent` y
 * `follow_up_2_sent` como checkbox booleano (los marca el cron). Estos
 * fórmula van con sufijo _visual para no chocar y para que el equipo vea
 * de un vistazo el estado igual que con form_reminder_sent.
 *
 * Uso: npx tsx scripts/add-followup-checkbox.ts
 *      npx tsx scripts/add-followup-checkbox.ts --apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PAT = process.env.AIRTABLE_PAT!;
const BASE = process.env.AIRTABLE_BASE_ID!;
const TABLE_NAME = "Postulaciones MF26";
const APPLY = process.argv.includes("--apply");

const FIELDS_TO_CREATE: { name: string; source: string; description: string }[] = [
  {
    name: "follow_up_1_sent_visual",
    source: "follow_up_1_sent_at",
    description: "Checkbox visual: TRUE cuando follow_up_1_sent_at está set",
  },
  {
    name: "follow_up_2_sent_visual",
    source: "follow_up_2_sent_at",
    description: "Checkbox visual: TRUE cuando follow_up_2_sent_at está set",
  },
];

async function main() {
  const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const meta = await metaRes.json();
  const tabla = meta.tables.find((t: { name: string }) => t.name === TABLE_NAME);
  if (!tabla) { console.log(`❌ No encontré la tabla "${TABLE_NAME}"`); return; }

  const tableId = tabla.id;
  console.log(`Tabla: ${TABLE_NAME} (${tableId})\n`);

  for (const target of FIELDS_TO_CREATE) {
    const yaExiste = tabla.fields.find((f: { name: string }) => f.name === target.name);
    const fuente = tabla.fields.find((f: { name: string }) => f.name === target.source);

    console.log(`── ${target.name} ────────────────────`);
    console.log(`  Fuente: ${target.source} → ${fuente ? `existe (${fuente.type})` : "❌ NO existe"}`);
    console.log(`  Destino: ${target.name} → ${yaExiste ? `ya existe (${yaExiste.type})` : "no existe (lo creo)"}`);

    if (!fuente) { console.log(`  ❌ Skip: el campo fuente no existe.\n`); continue; }
    if (yaExiste) { console.log(`  ✅ Ya existe. Nada que hacer.\n`); continue; }

    const body = {
      name: target.name,
      type: "formula" as const,
      description: target.description,
      options: { formula: `{${target.source}} != BLANK()` },
    };

    if (!APPLY) {
      console.log(`  DRY-RUN — body que enviaría:`);
      console.log("  " + JSON.stringify(body));
      console.log();
      continue;
    }

    const createRes = await fetch(
      `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${tableId}/fields`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const created = await createRes.json();
    if (!createRes.ok) {
      console.log(`  ❌ Error creando campo:`);
      console.log("  " + JSON.stringify(created));
      console.log();
      continue;
    }
    console.log(`  ✅ Creado: ${created.name} (${created.id}, type ${created.type})\n`);
  }

  if (!APPLY) {
    console.log("DRY-RUN — corré con --apply para crear los campos.");
  } else {
    console.log("Listo. Verificá en Airtable que aparezcan las dos columnas con ✓ donde corresponda.");
  }
}

main().catch((err) => { console.error("ERROR:", err); process.exit(1); });

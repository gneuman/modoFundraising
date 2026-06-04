/**
 * Pre-marca form_reminder_sent_at en las postulaciones abandonadas VIEJAS
 * para que el cron NO les mande el recordatorio. Deja solo a la más reciente
 * (Quintil Valley) como candidata, para probar el flujo con 1.
 *
 * REQUISITO: el campo form_reminder_sent_at YA debe existir en Postulaciones MF26.
 *
 * Uso:
 *   npx tsx scripts/premarcar-form-reminder.ts          (dry-run, no escribe)
 *   npx tsx scripts/premarcar-form-reminder.ts --apply  (escribe de verdad)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import Airtable from "airtable";

function base(table: string) {
  return new Airtable({ apiKey: process.env.AIRTABLE_PAT })
    .base(process.env.AIRTABLE_BASE_ID!)(table);
}
const POSTULACIONES = "Postulaciones MF26";

// El record que SÍ queremos que reciba el recordatorio (NO se pre-marca).
const DEJAR_COMO_CANDIDATA = "recwTrfzwe3nHe9QC"; // Quintil Valley (mariaignacia@quintilvalley.cl)

const APPLY = process.argv.includes("--apply");

async function main() {
  const posts = await base(POSTULACIONES).select().all();
  // El campo form_reminder_sent_at existe (confirmado vía Metadata API, tipo dateTime).
  // No se valida por presencia en records porque Airtable omite campos vacíos en la API REST.

  const candidatas = posts.filter((p) => {
    const f = p.fields as Record<string, unknown>;
    const founderArr = (f["first_name (from founder_record)"] as string[]) ?? [];
    const emailArr = (f["email (from founder_record)"] as string[]) ?? [];
    return (
      f.status === "Nueva postulación" &&
      f.accept_legal_terms !== true &&
      !!f.created_at &&
      emailArr.length > 0 &&
      founderArr.length > 0 &&
      !f.form_reminder_sent_at
    );
  });

  const aMarcar = candidatas.filter((p) => p.id !== DEJAR_COMO_CANDIDATA);
  const now = new Date().toISOString();

  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — pre-marcando ${aMarcar.length} viejas; dejando 1 candidata (${DEJAR_COMO_CANDIDATA})\n`);

  for (const p of aMarcar) {
    const email = ((p.fields as Record<string, unknown>)["email (from founder_record)"] as string[])?.[0];
    if (APPLY) {
      await base(POSTULACIONES).update(p.id, { form_reminder_sent_at: now } as never, { typecast: true });
      console.log(`  ✅ marcada ${p.id} (${email})`);
    } else {
      console.log(`  [dry] marcaría ${p.id} (${email})`);
    }
  }

  const quintil = posts.find((p) => p.id === DEJAR_COMO_CANDIDATA);
  console.log(`\nCandidata que queda para el cron: ${DEJAR_COMO_CANDIDATA} (${quintil ? ((quintil.fields as Record<string, unknown>)["email (from founder_record)"] as string[])?.[0] : "NO ENCONTRADA"})`);
}
main().catch((e) => { console.error(e); process.exit(1); });

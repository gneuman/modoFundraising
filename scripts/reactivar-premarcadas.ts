/**
 * Reactiva las 10 postulaciones pre-marcadas: borra su form_reminder_sent_at
 * para que el cron las vuelva a tomar como candidatas y les mande el recordatorio.
 *
 * Solo toca las que tienen el timestamp EXACTO del pre-marcado masivo, para no
 * tocar a Quintil Valley (que ya recibió su correo de verdad, con otro timestamp).
 *
 * Uso:
 *   npx tsx scripts/reactivar-premarcadas.ts          (dry-run)
 *   npx tsx scripts/reactivar-premarcadas.ts --apply  (escribe)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import Airtable from "airtable";

function base(table: string) {
  return new Airtable({ apiKey: process.env.AIRTABLE_PAT })
    .base(process.env.AIRTABLE_BASE_ID!)(table);
}
const POSTULACIONES = "Postulaciones MF26";
const PREMARCADO_TS = "2026-06-03T16:06:00.450Z";
const APPLY = process.argv.includes("--apply");

async function main() {
  const posts = await base(POSTULACIONES).select().all();
  const target = posts.filter(
    (p) => (p.fields as Record<string, unknown>).form_reminder_sent_at === PREMARCADO_TS
  );

  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — reactivando ${target.length} (borrando form_reminder_sent_at)\n`);

  for (const p of target) {
    const email = ((p.fields as Record<string, unknown>)["email (from founder_record)"] as string[])?.[0];
    if (APPLY) {
      // En Airtable, escribir null/"" en un dateTime lo limpia.
      await base(POSTULACIONES).update(p.id, { form_reminder_sent_at: null } as never, { typecast: true });
      console.log(`  ✅ reactivada ${p.id} (${email})`);
    } else {
      console.log(`  [dry] reactivaría ${p.id} (${email})`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

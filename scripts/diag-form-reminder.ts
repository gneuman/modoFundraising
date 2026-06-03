import { config } from "dotenv";
config({ path: ".env.local" });
import Airtable from "airtable";

function base(table: string) {
  return new Airtable({ apiKey: process.env.AIRTABLE_PAT })
    .base(process.env.AIRTABLE_BASE_ID!)(table);
}
const POSTULACIONES = "Postulaciones MF26";
const HOURS = 1;
const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3.6e6;

async function main() {
  const posts = await base(POSTULACIONES).select().all();

  // ¿Existe el campo form_reminder_sent_at en algún record?
  const tieneCampo = posts.some((p) => "form_reminder_sent_at" in (p.fields as object));
  console.log(`Campo form_reminder_sent_at presente en algún record: ${tieneCampo ? "SÍ" : "NO (¡crear en Airtable!)"}`);

  // Replicar EXACTAMENTE la lógica esAbandonada del cron
  const abandonadas = posts.filter((p) => {
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

  console.log(`\n=== Candidatas a recordatorio (status="Nueva postulación", sin completar, sin recordatorio) ===`);
  for (const p of abandonadas) {
    const f = p.fields as Record<string, unknown>;
    const h = Math.round(hoursSince(f.created_at as string) * 10) / 10;
    const email = ((f["email (from founder_record)"] as string[]) ?? [])[0];
    console.log(`  ${p.id} | ${email} | hace ${h}h | ${h >= HOURS ? "SE ENVIARÍA" : `esperar ${(HOURS - h).toFixed(1)}h`}`);
  }
  if (!abandonadas.length) console.log("  (ninguna)");

  // Las que YA recibieron recordatorio (para confirmar que el campo se está marcando)
  const yaEnviadas = posts.filter((p) => (p.fields as Record<string, unknown>).form_reminder_sent_at);
  console.log(`\n=== Ya tienen form_reminder_sent_at marcado (${yaEnviadas.length}) ===`);
  for (const p of yaEnviadas) {
    const f = p.fields as Record<string, unknown>;
    console.log(`  ${p.id} | ${f.form_reminder_sent_at} | status=${f.status}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

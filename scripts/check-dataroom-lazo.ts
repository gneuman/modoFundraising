/**
 * Busca la clase "Dataroom & Fundraising by Lazo" y muestra su estado completo
 * para diagnosticar por qué no se mandó la invitación.
 * Uso: npx tsx scripts/check-dataroom-lazo.ts
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

async function main() {
  const records = await base("tblHRJ35xMM3rQa85")
    .select({ sort: [{ field: "fecha", direction: "asc" }] })
    .all();

  const matches = records.filter((r) => {
    const t = String((r.fields as Record<string, unknown>).titulo ?? "").toLowerCase();
    return t.includes("dataroom") || t.includes("lazo");
  });

  if (!matches.length) {
    console.log("No se encontró ninguna clase con 'Dataroom' o 'Lazo' en el título.");
    console.log("\nTítulos disponibles:");
    for (const r of records) {
      console.log(`  - ${(r.fields as Record<string, unknown>).titulo}`);
    }
    return;
  }

  for (const r of matches) {
    const f = r.fields as Record<string, unknown>;
    console.log("─".repeat(70));
    console.log(`id: ${r.id}`);
    console.log(`  titulo: ${f.titulo}`);
    console.log(`  fecha: ${f.fecha}`);
    console.log(`  semana: ${f.semana}`);
    console.log(`  listo_publicar: ${f.listo_publicar}`);
    console.log(`  calendar_event_id: ${f.calendar_event_id || "(vacío)"}`);
    console.log(`  calendar_event_id_team: ${f.calendar_event_id_team || "(vacío)"}`);
    console.log(`  meet_link: ${f.meet_link || "(vacío)"}`);
    console.log(`  url_live: ${f.url_live || "(vacío)"}`);
    console.log(`  url_live_team: ${f.url_live_team || "(vacío)"}`);
    console.log(`  duracion_minutos: ${f.duracion_minutos}`);
    const desc = f.descripcion as string | undefined;
    if (desc) console.log(`  descripcion: ${desc.slice(0, 120)}${desc.length > 120 ? "..." : ""}`);
  }
}

main().catch(console.error);

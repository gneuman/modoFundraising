/**
 * Diagnostica la vista de Postulaciones que recibe el correo + invite-all.
 * View: viwaIjGjXI0nq90Lp en tabla Postulaciones MF26
 * URL: https://airtable.com/appGm9DW6WOKnDEAW/tblTif15ehnRN4K74/viwaIjGjXI0nq90Lp
 *
 * Para cada postulacion de la vista:
 *  - Trae el(los) founder(es) ligado(s)
 *  - Reporta si ya tienen portal_access=true
 *  - Reporta si ya estan invitados al calendar
 *  - Imprime totales para confirmar antes de mandar el live
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

const POSTULACIONES_TABLE = "Postulaciones MF26";
const FOUNDERS_TABLE = "Founders MF26";
const VIEW_ID = "viwaIjGjXI0nq90Lp";

async function main() {
  // 1. Postulaciones en la vista
  let postulaciones;
  try {
    postulaciones = await base(POSTULACIONES_TABLE).select({ view: VIEW_ID }).all();
  } catch {
    console.warn(`(aviso) no pude leer la vista ${VIEW_ID} por API. Caigo a status=Admitida o Inscrita.`);
    postulaciones = await base(POSTULACIONES_TABLE)
      .select({ filterByFormula: `OR({status}="Admitida", {status}="Inscrita")` })
      .all();
  }

  console.log(`=== Vista de onboarding (Postulaciones) ===`);
  console.log(`Total postulaciones en la vista: ${postulaciones.length}`);

  // 2. Founders ligados
  const founderIds = new Set<string>();
  for (const p of postulaciones) {
    const ids = (p.fields as any).founder_record as string[] | undefined;
    if (ids) ids.forEach((id) => founderIds.add(id));
    // Tambien sumamos founders ligados via startup (todos los founders del mismo startup)
    const startupIds = (p.fields as any)["Founders (from startup_record)"] as string[] | undefined;
    if (startupIds) startupIds.forEach((id) => founderIds.add(id));
  }
  console.log(`Founders ligados (unicos, incluyendo cofounders por startup): ${founderIds.size}`);

  // 3. Detalle de cada founder
  const founderRecords = await Promise.all(
    [...founderIds].map((id) => base(FOUNDERS_TABLE).find(id).catch(() => null)),
  );

  const validos = founderRecords.filter((r) => r) as NonNullable<typeof founderRecords[number]>[];
  let conAcceso = 0;
  let sinAcceso = 0;
  let yaInvitados = 0;
  let sinEmail = 0;
  const detalleSinAcceso: string[] = [];
  const detalleSinEmail: string[] = [];

  for (const r of validos) {
    const f = r.fields as any;
    const email = (f.email ?? "").trim();
    if (!email) {
      sinEmail++;
      detalleSinEmail.push(`${r.id} | ${f.first_name ?? ""} ${f.last_name ?? ""}`);
      continue;
    }
    if (f.portal_access === true) conAcceso++;
    else {
      sinAcceso++;
      detalleSinAcceso.push(`${email} | ${f.first_name ?? ""} ${f.last_name ?? ""}`);
    }
    if (f.invitado_calendar_at) yaInvitados++;
    // El campo invitado_calendar_at puede no existir aun, lo manejamos defensivo
  }

  console.log(`\n=== Founders ===`);
  console.log(`  Con portal_access=true:    ${conAcceso}`);
  console.log(`  SIN portal_access:         ${sinAcceso}`);
  console.log(`  Ya invitados al calendar:  ${yaInvitados}`);
  console.log(`  Sin email registrado:      ${sinEmail}`);

  if (detalleSinAcceso.length) {
    console.log(`\n--- Founders SIN portal_access (van a quedar afuera del live si no se prenden) ---`);
    detalleSinAcceso.forEach((d) => console.log(`  ${d}`));
  }
  if (detalleSinEmail.length) {
    console.log(`\n--- Founders sin email (van a quedar afuera) ---`);
    detalleSinEmail.forEach((d) => console.log(`  ${d}`));
  }

  // 4. Eventos del calendar
  const clases = await base("Clases MF26")
    .select({ fields: ["titulo", "fecha", "calendar_event_id", "calendar_event_id_team"] })
    .all();
  const conEvFounders = clases.filter((c) => (c.fields as any).calendar_event_id).length;
  const conEvTeam = clases.filter((c) => (c.fields as any).calendar_event_id_team).length;

  console.log(`\n=== Clases / Calendar ===`);
  console.log(`  Total clases: ${clases.length}`);
  console.log(`  Con calendar_event_id (founders): ${conEvFounders}`);
  console.log(`  Con calendar_event_id_team (team): ${conEvTeam}`);

  console.log(`\n=== RESUMEN PARA EL LIVE ===`);
  const totalElegibles = conAcceso + sinAcceso;
  console.log(`  Founders elegibles para recibir onboarding: ${totalElegibles}`);
  console.log(`    -> de esos, ${sinAcceso} necesitan portal_access=true antes`);
  console.log(`  Invitaciones de calendar a mandar: ${totalElegibles} founders x ${conEvFounders} eventos = ${totalElegibles * conEvFounders} attendees totales`);
  console.log(`  Correos de onboarding a mandar: ${totalElegibles}`);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});

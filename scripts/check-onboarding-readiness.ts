/**
 * Diagnostico pre-live de onboarding.
 * Reporta:
 *  - Founders con portal_access (a quienes va el invite-all)
 *  - Founders con estado activo (Inscrita/Admitida/etc) que NO tienen portal_access
 *  - Cantidad de eventos founders + eventos team
 *  - Founders ya marcados como invitados (invitado_calendar_at)
 */

import Airtable from "airtable";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(
  process.env.AIRTABLE_BASE_ID!,
);

const ACTIVOS = ["Admitida", "Inscrita", "Beca 100%", "Pago Pendiente"];

async function main() {
  // 1. Todos los founders
  const all = await base("Founders MF26")
    .select({ fields: ["email", "first_name", "last_name", "portal_access", "Postulaciones MF26"] })
    .all();

  const withAccess = all.filter((r) => (r.fields as any).portal_access === true);
  // El campo invitado_calendar_at podria no existir aun en este base; lo probamos por separado.
  let alreadyInvited: typeof withAccess = [];
  let pendingInvite: typeof withAccess = withAccess;
  try {
    const withFlag = await base("Founders MF26")
      .select({ fields: ["email", "invitado_calendar_at"], filterByFormula: `AND({portal_access} = 1, {invitado_calendar_at} != "")` })
      .all();
    const invitedEmails = new Set(withFlag.map((r) => ((r.fields as any).email ?? "").toLowerCase()));
    alreadyInvited = withAccess.filter((r) => invitedEmails.has(((r.fields as any).email ?? "").toLowerCase()));
    pendingInvite = withAccess.filter((r) => !invitedEmails.has(((r.fields as any).email ?? "").toLowerCase()));
  } catch {
    console.warn("(aviso) campo invitado_calendar_at no existe en Founders MF26 -> trato a todos como pendientes");
  }

  // 1.b. Postulaciones activas (probamos sin filtrar columnas por si email no esta en este base)
  const postulaciones = await base("Postulaciones MF26")
    .select({ filterByFormula: `OR({status} = "Admitida", {status} = "Inscrita", {status} = "Beca 100%", {status} = "Pago Pendiente")` })
    .all();

  // Cruce: postulaciones activas cuyo email no esté en withAccess
  const accessEmails = new Set(withAccess.map((r) => ((r.fields as any).email ?? "").toLowerCase()));
  const activosSinAcceso = postulaciones.filter((p) => {
    const email = ((p.fields as any).email ?? "").toLowerCase();
    return email && !accessEmails.has(email);
  });

  // 2. Eventos en clases
  const clases = await base("Clases MF26")
    .select({ fields: ["titulo", "fecha", "calendar_event_id", "calendar_event_id_team"] })
    .all();

  const conEventoFounders = clases.filter((r) => (r.fields as any).calendar_event_id);
  const conEventoTeam = clases.filter((r) => (r.fields as any).calendar_event_id_team);
  const sinEvento = clases.filter((r) => {
    const f = r.fields as any;
    return !f.calendar_event_id && !f.calendar_event_id_team;
  });

  console.log("=== FOUNDERS ===");
  console.log(`Total founders en Airtable: ${all.length}`);
  console.log(`Con portal_access (van a recibir invite-all): ${withAccess.length}`);
  console.log(`  -> ya invitados (invitado_calendar_at lleno): ${alreadyInvited.length}`);
  console.log(`  -> PENDIENTES de invitar: ${pendingInvite.length}`);
  console.log(`Activos (Admitida/Inscrita/Beca100/PagoPend) SIN portal_access: ${activosSinAcceso.length}`);

  if (pendingInvite.length) {
    console.log("\nPendientes de invitar (portal_access=1, invitado_calendar_at vacio):");
    pendingInvite.forEach((r) => {
      const f = r.fields as any;
      console.log(`  - ${f.email} | ${f.first_name} ${f.last_name} | estado=${f.estado}`);
    });
  }

  if (activosSinAcceso.length) {
    console.log("\nPostulaciones activas SIN portal_access en Founders (no van a recibir invite-all, revisar):");
    activosSinAcceso.forEach((r) => {
      const f = r.fields as any;
      console.log(`  - ${f.email} | ${f.first_name} | status=${f.status}`);
    });
  }

  console.log("\n=== CLASES / CALENDAR ===");
  console.log(`Total clases en Airtable: ${clases.length}`);
  console.log(`Con calendar_event_id (founders): ${conEventoFounders.length}`);
  console.log(`Con calendar_event_id_team (team): ${conEventoTeam.length}`);
  console.log(`SIN ningun evento: ${sinEvento.length}`);

  if (sinEvento.length) {
    console.log("\nClases sin evento de calendar:");
    sinEvento.forEach((r) => {
      const f = r.fields as any;
      console.log(`  - ${f.titulo} (${f.fecha})`);
    });
  }

  console.log("\n=== PRE-CHECK ONBOARDING EMAIL ===");
  console.log(`Para el correo de onboarding masivo: NO existe endpoint /api/admin/onboarding/send-all.`);
  console.log(`Hoy se manda 1x1 desde el TestPanel o desde send-email por founder.`);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});

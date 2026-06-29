export const dynamic = "force-dynamic";
export const maxDuration = 60; // 26 eventos × ~1s cada uno con sendUpdates="all" rebasa el default de 10s

import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getAllFoundersWithAccess, getCalendarEventIds, markFoundersAsInvited } from "@/lib/airtable";
import { addAttendeesToAllEvents } from "@/lib/calendar";
import { obtenerSesion } from "@/lib/auth";

// POST /api/admin/calendar/invite-all
// Invita a los founders con portal_access = true que aún NO fueron invitados
// (campo invitado_calendar_at vacío). Después marca cada uno como invitado
// con timestamp + email del admin que apretó el botón, para no reinvitar.
//
// Acepta query param ?force=1 para reinvitar a todos (útil si se borran eventos
// del calendar y hay que rehacer las invitaciones desde cero).
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const session = await obtenerSesion();
  const adminEmail = session?.email ?? "unknown";
  const force = new URL(req.url).searchParams.get("force") === "1";

  const [founders, eventIds] = await Promise.all([
    getAllFoundersWithAccess({ excludeAlreadyInvited: !force }),
    getCalendarEventIds(),
  ]);

  if (!eventIds.length) {
    return NextResponse.json(
      { error: "No hay eventos en Calendar. Agendá las clases primero." },
      { status: 400 },
    );
  }

  if (!founders.length) {
    return NextResponse.json(
      {
        error: force
          ? "No hay founders con acceso al portal."
          : "Todos los founders ya fueron invitados. Usá ?force=1 para reinvitar.",
      },
      { status: 400 },
    );
  }

  const emails = founders.map((f) => f.email);
  const result = await addAttendeesToAllEvents(eventIds, emails);

  // Solo marcamos como invitados si la operación llegó hasta el final.
  // Si algún evento falló, igual marcamos: Google ya envió las invitaciones
  // para los que sí completaron, y el admin puede ver el desglose para
  // decidir si correr ?force=1.
  await markFoundersAsInvited(
    founders.map((f) => f.id),
    adminEmail,
  );

  return NextResponse.json({
    ok: true,
    invited: founders.length,
    events: eventIds.length,
    eventsOk: result.ok.length,
    eventsFailed: result.failed.length,
    eventsSkipped: result.skipped.length,
    failures: result.failed,
    invitedBy: adminEmail,
    founders: founders.map((f) => ({ name: `${f.first_name} ${f.last_name}`.trim(), email: f.email })),
  });
}

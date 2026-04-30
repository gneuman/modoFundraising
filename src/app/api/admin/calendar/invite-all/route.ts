export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getAllFoundersWithAccess, getCalendarEventIds } from "@/lib/airtable";
import { addAttendeesToAllEvents } from "@/lib/calendar";

// POST /api/admin/calendar/invite-all
// Invita a TODOS los founders con portal_access = true a todos los eventos de Calendar.
// Esto incluye founders principales + co-founders invitados via equipo/invitar.
// addAttendeesToAllEvents ya evita duplicados, así que es seguro correrlo múltiples veces.
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const [founders, eventIds] = await Promise.all([
    getAllFoundersWithAccess(),
    getCalendarEventIds(),
  ]);

  if (!eventIds.length) {
    return NextResponse.json(
      { error: "No hay eventos en Calendar. Agendá las clases primero." },
      { status: 400 }
    );
  }

  if (!founders.length) {
    return NextResponse.json(
      { error: "No hay founders con acceso al portal aún." },
      { status: 400 }
    );
  }

  const emails = founders.map((f) => f.email);
  await addAttendeesToAllEvents(eventIds, emails);

  return NextResponse.json({
    ok: true,
    invited: founders.length,
    events: eventIds.length,
    founders: founders.map((f) => ({ name: `${f.first_name} ${f.last_name}`, email: f.email })),
  });
}

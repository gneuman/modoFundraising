export const dynamic = "force-dynamic";
export const maxDuration = 60; // un solo evento, pero con sendUpdates="all" a ~100 founders

import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getAllFoundersWithAccess } from "@/lib/airtable";
import { inviteFoundersToEvent } from "@/lib/calendar";
import { obtenerSesion } from "@/lib/auth";

// POST /api/admin/calendar/invite-event
// Body: { eventId: string }
//
// Invita a TODOS los founders con portal_access = 1 a UN SOLO evento (la clase
// que el admin abrió en el modal). Sin filtrar por nombre de clase (S1/S2), sin
// tocar el campo invitado_calendar_at: acá el eje es el EVENTO, no el founder.
//
// Idempotente: ensureAttendees solo agrega a los que faltan y Google solo
// notifica a esos. Apretar el botón dos veces no vuelve a molestar a nadie.
//
// Nace de OP-2227: el equipo necesitaba poder invitar a una clase nueva sin
// depender de correr el cron sync-attendees a mano.
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const session = await obtenerSesion();
  const adminEmail = session?.email ?? "unknown";

  let body: { eventId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventId = body.eventId?.trim();
  if (!eventId) {
    return NextResponse.json({ error: "eventId requerido" }, { status: 400 });
  }

  const founders = await getAllFoundersWithAccess();
  const emails = founders.map((f) => f.email).filter(Boolean);
  if (!emails.length) {
    return NextResponse.json(
      { error: "No hay founders con acceso al portal." },
      { status: 400 },
    );
  }

  try {
    const { added, total } = await inviteFoundersToEvent(eventId, emails);
    return NextResponse.json({
      ok: true,
      eventId,
      added,
      total,
      alreadyIn: total - added,
      invitedBy: adminEmail,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getClasesWithContent, updateClase } from "@/lib/airtable";
import { createCalendarEvent } from "@/lib/calendar";

// POST /api/admin/calendar/schedule
// Agenda en Google Calendar las clases que ya existen en Airtable pero no tienen evento
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const clases = await getClasesWithContent();
  const sinEvento = clases.filter((c) => c.fecha && !c.calendar_event_id);

  const results = await Promise.allSettled(
    sinEvento.map(async (clase) => {
      const { eventId, meetLink } = await createCalendarEvent({
        titulo: clase.titulo ?? "Clase sin título",
        descripcion: clase.descripcion,
        fecha: clase.fecha!,
        duracionMinutos: 90,
      });
      await updateClase(clase.id!, {
        calendar_event_id: eventId,
        meet_link: meetLink,
        url_live: clase.url_live || meetLink,
      });
      return { id: clase.id, titulo: clase.titulo, eventId, meetLink };
    })
  );

  const ok = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ scheduled: ok, failed, total: sinEvento.length });
}

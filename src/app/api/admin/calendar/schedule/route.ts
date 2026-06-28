export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getClasesWithContent, updateClase, type ClaseInput } from "@/lib/airtable";
import { createCalendarEvent } from "@/lib/calendar";

// Misma convencion que clase-card.tsx#stripSemanaPrefix: en Airtable el titulo
// guarda "Sx —" para que admin ordene visualmente, pero el founder lo ve sin prefijo
// (portal y ahora tambien Google Calendar).
function stripSemanaPrefix(titulo: string): string {
  return titulo.replace(/^S\d+\s*[—–-]\s*/, "").trim();
}

// POST /api/admin/calendar/schedule
// Agenda en Google Calendar las clases con fecha. Crea evento principal (founders)
// y evento de equipo si faltan. Idempotente — si ya existe alguno, solo agenda el faltante.
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const clases = await getClasesWithContent();
  const conFecha = clases.filter((c) => c.fecha);
  const pendientes = conFecha.filter((c) => !c.calendar_event_id || !c.calendar_event_id_team);

  const results = await Promise.allSettled(
    pendientes.map(async (clase) => {
      const patch: Partial<ClaseInput> = {};

      const tituloLimpio = stripSemanaPrefix(clase.titulo ?? "Clase sin título");

      if (!clase.calendar_event_id) {
        const { eventId, meetLink } = await createCalendarEvent({
          titulo: tituloLimpio,
          descripcion: clase.descripcion,
          fecha: clase.fecha!,
          duracionMinutos: 90,
        });
        patch.calendar_event_id = eventId;
        patch.meet_link = meetLink;
        if (!clase.url_live) patch.url_live = meetLink;
      }

      if (!clase.calendar_event_id_team) {
        const { eventId, meetLink } = await createCalendarEvent({
          titulo: `[Equipo] ${tituloLimpio}`,
          descripcion: clase.descripcion,
          fecha: clase.fecha!,
          duracionMinutos: 90,
        });
        patch.calendar_event_id_team = eventId;
        patch.meet_link_team = meetLink;
        if (!clase.url_live_team) patch.url_live_team = meetLink;
      }

      await updateClase(clase.id!, patch);
      return { id: clase.id, titulo: clase.titulo, patch };
    })
  );

  const ok = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ scheduled: ok, failed, total: pendientes.length });
}

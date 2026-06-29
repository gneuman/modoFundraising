export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { verificarAdmin } from "@/lib/admin-auth";
import { getClasesWithContent, createClase, updateClase, getClaseById } from "@/lib/airtable";
import { createCalendarEvent, updateCalendarEvent } from "@/lib/calendar";

export async function GET(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const clases = await getClasesWithContent();
  return NextResponse.json(clases);
}

export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const body = await req.json();

  // 1. Crear en Airtable
  const id = await createClase(body);

  // 2. Crear DOS eventos en Calendar (founders + equipo) si tiene fecha
  if (body.fecha) {
    try {
      const [main, team] = await Promise.all([
        createCalendarEvent({
          titulo: body.titulo,
          descripcion: body.descripcion,
          fecha: body.fecha,
          duracionMinutos: 90,
        }),
        createCalendarEvent({
          titulo: `[Equipo] ${body.titulo}`,
          descripcion: body.descripcion,
          fecha: body.fecha,
          duracionMinutos: 90,
        }),
      ]);
      await updateClase(id, {
        calendar_event_id: main.eventId,
        meet_link: main.meetLink,
        url_live: body.url_live || main.meetLink,
        calendar_event_id_team: team.eventId,
        meet_link_team: team.meetLink,
        url_live_team: body.url_live_team || team.meetLink,
      });
      revalidateTag("clases-content", { expire: 0 });
      return NextResponse.json({
        id,
        calendar_event_id: main.eventId,
        meet_link: main.meetLink,
        calendar_event_id_team: team.eventId,
        meet_link_team: team.meetLink,
      });
    } catch (err) {
      console.error("Calendar error:", err instanceof Error ? err.message : err);
    }
  }

  revalidateTag("clases-content", { expire: 0 });
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const { id, ...data } = await req.json();

  // Actualizar en Airtable
  await updateClase(id, data);

  // Si cambia fecha o título, actualizar el evento de Calendar existente (no crear uno nuevo)
  const calendarFields = ["fecha", "titulo", "descripcion"];
  const needsCalendarUpdate = calendarFields.some((f) => f in data);

  if (needsCalendarUpdate) {
    try {
      const clase = await getClaseById(id);
      const nuevoTitulo = data.titulo ?? clase?.titulo;
      const nuevaDescripcion = data.descripcion ?? clase?.descripcion;
      const nuevaFecha = data.fecha ?? clase?.fecha;
      // Solo actualizar si ya tiene evento — nunca crear uno nuevo desde PATCH
      if (clase?.calendar_event_id) {
        await updateCalendarEvent(clase.calendar_event_id, {
          titulo: nuevoTitulo,
          descripcion: nuevaDescripcion,
          fecha: nuevaFecha,
        });
      }
      if (clase?.calendar_event_id_team) {
        await updateCalendarEvent(clase.calendar_event_id_team, {
          titulo: nuevoTitulo ? `[Equipo] ${nuevoTitulo}` : undefined,
          descripcion: nuevaDescripcion,
          fecha: nuevaFecha,
        });
      }
    } catch (err) {
      console.error("Calendar update error:", err instanceof Error ? err.message : err);
    }
  }

  revalidateTag("clases-content", { expire: 0 });
  return NextResponse.json({ success: true });
}

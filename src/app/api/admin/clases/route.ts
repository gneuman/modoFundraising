export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
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

  // 2. Crear evento en Calendar solo si tiene fecha y no hay evento previo
  if (body.fecha) {
    try {
      const { eventId, meetLink } = await createCalendarEvent({
        titulo: body.titulo,
        descripcion: body.descripcion,
        fecha: body.fecha,
        duracionMinutos: 90,
      });
      await updateClase(id, {
        calendar_event_id: eventId,
        meet_link: meetLink,
        url_live: body.url_live || meetLink,
      });
      return NextResponse.json({ id, calendar_event_id: eventId, meet_link: meetLink });
    } catch (err) {
      console.error("Calendar error:", err instanceof Error ? err.message : err);
    }
  }

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
      // Solo actualizar si ya tiene evento — nunca crear uno nuevo desde PATCH
      if (clase?.calendar_event_id) {
        await updateCalendarEvent(clase.calendar_event_id, {
          titulo: data.titulo ?? clase.titulo,
          descripcion: data.descripcion ?? clase.descripcion,
          fecha: data.fecha ?? clase.fecha,
        });
      }
    } catch (err) {
      console.error("Calendar update error:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ success: true });
}

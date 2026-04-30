import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getClasesWithContent, createClase, updateClase } from "@/lib/airtable";
import { createCalendarEvent } from "@/lib/calendar";

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

  // 1. Crear en Airtable primero
  const id = await createClase(body);

  // 2. Si tiene fecha, crear evento en Google Calendar con Meet automático
  if (body.fecha) {
    try {
      const { eventId, meetLink } = await createCalendarEvent({
        titulo: body.titulo,
        descripcion: body.descripcion,
        fecha: body.fecha,
        duracionMinutos: 90,
      });
      // Guardar event ID y Meet link en Airtable
      await updateClase(id, {
        calendar_event_id: eventId,
        meet_link: meetLink,
        url_live: body.url_live || meetLink, // usar Meet si no hay URL manual
      });
      return NextResponse.json({ id, calendar_event_id: eventId, meet_link: meetLink });
    } catch (err) {
      // Si falla Calendar, la clase ya fue creada — no es bloqueante
      console.error("Calendar error (non-blocking):", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const { id, ...data } = await req.json();
  await updateClase(id, data);
  return NextResponse.json({ success: true });
}

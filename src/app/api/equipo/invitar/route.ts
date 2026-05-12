import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { crearTokenMagic } from "@/lib/auth";
import { getAllApplications, getCalendarEventIds } from "@/lib/airtable";
import Airtable from "airtable";
import { sendMagicLink } from "@/lib/gmail";
import { addAttendeeToEvents } from "@/lib/calendar";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);

export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, apellido, email, whatsapp, linkedin, rol, pais, es_mujer, startupName, founderName } = await req.json();
  if (!email || !nombre || !apellido || !rol) {
    return NextResponse.json({ error: "Nombre, apellido, email y rol son requeridos" }, { status: 400 });
  }

  // Buscar la postulación del founder logueado para obtener IDs de postulación y startup
  const apps = await getAllApplications();
  const app = apps.find((a) => a.email === session.email);
  if (!app?.id) return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });

  const postulacionId = app.id;
  const startupId = (app.startup_record as string[] | undefined)?.[0];

  // Crear el founder en Airtable
  const founderRecord = await base("Founders MF26").create({
    email,
    first_name: nombre,
    last_name: apellido,
    whatsapp: whatsapp ?? "",
    linkedin_founder: linkedin ?? "",
    founder_role: rol,
    country_residence: pais ?? "",
    founder_team_women: es_mujer ?? "",
    portal_access: true,
    joined_at: new Date().toISOString(),
  } as never);

  // Ligar el nuevo founder a la postulación existente (append al linked field)
  const postulacion = await base("Postulaciones MF26").find(postulacionId);
  const founderIds: string[] = ((postulacion.fields as Record<string, unknown>).founder_record as string[]) ?? [];

  await base("Postulaciones MF26").update(postulacionId, {
    founder_record: [...founderIds, founderRecord.id],
  } as never);

  // Enviar magic link por Gmail
  const token = await crearTokenMagic(email);
  await sendMagicLink(email, token, "founder");

  // Agregar al nuevo founder a todos los eventos de Calendar
  try {
    const eventIds = await getCalendarEventIds();
    if (eventIds.length) await addAttendeeToEvents(eventIds, email);
  } catch (err) {
    console.error("Calendar invite error (non-blocking):", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true, founderId: founderRecord.id, startupId });
}

import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion, normalizarEmail } from "@/lib/auth";
import {
  getAllApplications,
  getFutureCalendarEventIds,
  markFounderOnboardingSent,
  markFoundersAsInvited,
} from "@/lib/airtable";
import Airtable from "airtable";
import { sendOnboardingEmail } from "@/lib/email-engine";
import { addAttendeeToEvents } from "@/lib/calendar";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.modofundraising.com").replace(/\/$/, "");
const PORTAL_URL = `${APP_URL}/portal`;
const SYSTEM_EMAIL = "system@modofundraising.com";

export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, apellido, email: emailRaw, whatsapp, linkedin, rol, pais, es_mujer, startupName, founderName } = await req.json();
  if (!emailRaw || !nombre || !apellido || !rol) {
    return NextResponse.json({ error: "Nombre, apellido, email y rol son requeridos" }, { status: 400 });
  }
  const email = normalizarEmail(emailRaw);

  // Buscar la postulación del founder logueado para obtener IDs de postulación y startup
  const apps = await getAllApplications();
  const sessionEmail = normalizarEmail(session.email);
  const app = apps.find((a) => a.email && normalizarEmail(a.email) === sessionEmail);
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

  // Onboarding completo (mismo correo que reciben los titulares vía drip masivo).
  // El correo lleva el magic link generado por el endpoint /auth/magic-link cuando
  // el cofounder hace click en "Ingresar al portal" desde el botón del template.
  // No bloqueante: si falla, igual marcamos el calendar para no dejar el founder
  // en limbo doble.
  try {
    await sendOnboardingEmail(email, nombre, PORTAL_URL);
    await markFounderOnboardingSent(founderRecord.id);
  } catch (err) {
    console.error("Onboarding email error (non-blocking):", err instanceof Error ? err.message : err);
  }

  // Agregar al nuevo founder solo a las clases FUTURAS de Calendar.
  // No invitamos a clases pasadas (Google manda email "invitación a evento del pasado"
  // que confunde y satura la bandeja). Si entra a mitad del programa, solo va a
  // las que faltan.
  try {
    const eventIds = await getFutureCalendarEventIds();
    if (eventIds.length) {
      await addAttendeeToEvents(eventIds, email);
      await markFoundersAsInvited([founderRecord.id], session.email ?? SYSTEM_EMAIL);
    }
  } catch (err) {
    console.error("Calendar invite error (non-blocking):", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true, founderId: founderRecord.id, startupId });
}

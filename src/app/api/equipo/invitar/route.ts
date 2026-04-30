import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { crearTokenMagic } from "@/lib/auth";
import { getAllApplications, getCalendarEventIds } from "@/lib/airtable";
import Airtable from "airtable";
import { Resend } from "resend";
import { addAttendeeToEvents } from "@/lib/calendar";

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID!);
const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");

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

  // Enviar magic link por email si Resend está configurado
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const token = await crearTokenMagic(email);
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}&role=founder`;

    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `${founderName} te invita al portal de ${startupName} en Modo Fundraising 2026`,
      html: `
        <h2>¡Hola ${nombre}!</h2>
        <p><strong>${founderName}</strong> te ha agregado al equipo de <strong>${startupName}</strong> en el programa <strong>Modo Fundraising 2026</strong> de Impacta VC.</p>
        ${rol ? `<p>Tu rol: <strong>${rol}</strong></p>` : ""}
        <p>Haz clic para acceder al portal:</p>
        <p><a href="${url}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Acceder al portal</a></p>
        <p style="color:#6b7280;font-size:14px;">Este enlace es válido por 15 minutos.</p>
        <br/><p>— Equipo Impacta VC<br/><a href="mailto:hello@impacta.vc">hello@impacta.vc</a></p>
      `,
    });
  }

  // Agregar al nuevo founder a todos los eventos de Calendar
  try {
    const eventIds = await getCalendarEventIds();
    if (eventIds.length) await addAttendeeToEvents(eventIds, email);
  } catch (err) {
    console.error("Calendar invite error (non-blocking):", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true, founderId: founderRecord.id, startupId });
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { verificarAdmin } from "@/lib/admin-auth";
import {
  getClasesWithContent,
  createClase,
  updateClase,
  getClaseByIdFresh,
  getAllFoundersWithAccess,
} from "@/lib/airtable";
import { upsertCalendarEvent } from "@/lib/calendar";

// Endpoints del portal /admin/clases.
//
// El botón Guardar (POST nueva clase, PATCH clase existente) usa el mismo
// upsertCalendarEvent que el webhook /api/airtable/clase-upsert para mantener
// un solo comportamiento en las dos puertas:
//   - En CREATE: invita a todos los Founders activos (portal_access = 1).
//   - En UPDATE: hace diff y solo patchea Calendar si cambió título/fecha/descripción.
//     NO toca attendees en updates (eso lo hace el flujo de inscripción/churn).
//     sendUpdates: 'all' si cambia título o fecha. Descripción sola → 'none'.

const TEAM_PREFIX = "[Equipo] ";

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

  // 2. Crear eventos Calendar (founders + equipo) si tiene fecha
  if (body.fecha && body.titulo) {
    try {
      const founderEmails = (await getAllFoundersWithAccess()).map((f) => f.email);

      const [main, team] = await Promise.all([
        upsertCalendarEvent({
          titulo: body.titulo,
          descripcion: body.descripcion,
          fecha: body.fecha,
          duracionMinutos: body.duracion_minutos,
          urlLive: body.url_live,
          attendeeEmails: founderEmails,
        }),
        upsertCalendarEvent({
          titulo: `${TEAM_PREFIX}${body.titulo}`,
          descripcion: body.descripcion,
          fecha: body.fecha,
          duracionMinutos: body.duracion_minutos,
          urlLive: body.url_live_team,
        }),
      ]);

      // Los eventos ya no traen Meet — url_live queda tal cual la puso el usuario.
      await updateClase(id, {
        calendar_event_id: main.eventId,
        calendar_event_id_team: team.eventId,
      });

      revalidateTag("clases-content", { expire: 0 });
      return NextResponse.json({
        id,
        calendar_event_id: main.eventId,
        calendar_event_id_team: team.eventId,
        attendeesAdded: main.attendeesAdded,
      });
    } catch (err) {
      console.error("[admin/clases POST] Calendar error:", err instanceof Error ? err.message : err);
    }
  }

  revalidateTag("clases-content", { expire: 0 });
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const { id, ...data } = await req.json();

  // 1. Actualizar en Airtable
  await updateClase(id, data);

  // 2. Si cambió título/fecha/descripción/url_live/duración, propagar a Calendar con diff
  const calendarFields = [
    "fecha",
    "titulo",
    "descripcion",
    "duracion_minutos",
    "url_live",
    "url_live_team",
  ];
  const needsCalendarUpdate = calendarFields.some((f) => f in data);

  let foundersResult = null;
  let teamResult = null;

  if (needsCalendarUpdate) {
    try {
      // Releer fresh para tener el estado mergeado (no solo el delta del PATCH)
      const clase = await getClaseByIdFresh(id);
      if (clase?.titulo && clase?.fecha) {
        [foundersResult, teamResult] = await Promise.all([
          clase.calendar_event_id
            ? upsertCalendarEvent({
                eventId: clase.calendar_event_id,
                titulo: clase.titulo,
                descripcion: clase.descripcion,
                fecha: clase.fecha,
                duracionMinutos: clase.duracion_minutos,
                urlLive: clase.url_live,
              })
            : Promise.resolve(null),
          clase.calendar_event_id_team
            ? upsertCalendarEvent({
                eventId: clase.calendar_event_id_team,
                titulo: `${TEAM_PREFIX}${clase.titulo}`,
                descripcion: clase.descripcion,
                fecha: clase.fecha,
                duracionMinutos: clase.duracion_minutos,
                urlLive: clase.url_live_team,
              })
            : Promise.resolve(null),
        ]);
      }
    } catch (err) {
      console.error("[admin/clases PATCH] Calendar error:", err instanceof Error ? err.message : err);
    }
  }

  revalidateTag("clases-content", { expire: 0 });
  return NextResponse.json({
    success: true,
    founders: foundersResult
      ? { action: foundersResult.action, changedFields: foundersResult.changedFields }
      : null,
    team: teamResult
      ? { action: teamResult.action, changedFields: teamResult.changedFields }
      : null,
  });
}

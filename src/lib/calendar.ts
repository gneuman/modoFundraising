import { google } from "googleapis";
import { TZ } from "@/lib/timezone";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN! });
  return auth;
}

export interface CalendarEventResult {
  eventId: string;
  meetLink: string;
  htmlLink: string;
}

// Crea un evento en Google Calendar con Google Meet automático
export async function createCalendarEvent(data: {
  titulo: string;
  descripcion?: string;
  fecha: string; // ISO string
  duracionMinutos?: number;
}): Promise<CalendarEventResult> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });

  const start = new Date(data.fecha);
  const end = new Date(start.getTime() + (data.duracionMinutos ?? 90) * 60_000);

  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    conferenceDataVersion: 1, // necesario para crear Meet automáticamente
    requestBody: {
      summary: data.titulo,
      description: data.descripcion ?? "",
      start: { dateTime: start.toISOString(), timeZone: TZ },
      end: { dateTime: end.toISOString(), timeZone: TZ },
      // Genera Google Meet automáticamente
      conferenceData: {
        createRequest: {
          requestId: `mf26-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      // Los asistentes no se ven entre sí
      guestsCanSeeOtherGuests: false,
      guestsCanInviteOthers: false,
    },
  });

  const event = res.data;
  const meetLink =
    event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ?? "";

  return {
    eventId: event.id!,
    meetLink,
    htmlLink: event.htmlLink ?? "",
  };
}

// Agrega un attendee a un evento existente (sin notificar al resto)
export async function addAttendeeToEvent(eventId: string, email: string): Promise<void> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });

  // Fetch evento actual
  const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
  const event = res.data;
  const attendees = event.attendees ?? [];

  // Evitar duplicados
  if (attendees.some((a) => a.email === email)) return;

  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    sendUpdates: "all", // manda invitación al nuevo asistente
    requestBody: {
      attendees: [...attendees, { email }],
      guestsCanSeeOtherGuests: false,
      guestsCanInviteOthers: false,
    },
  });
}

// Agrega un email a múltiples eventos (para cuando se inscribe una startup)
export async function addAttendeeToEvents(eventIds: string[], email: string): Promise<void> {
  await Promise.allSettled(eventIds.map((id) => addAttendeeToEvent(id, email)));
}

// Agrega múltiples emails a múltiples eventos (inscripción completa de startup).
// Paraleliza por evento porque 26 patches secuenciales con sendUpdates="all"
// se demoran ~60s y Vercel timeout-ea el handler. Devuelve el desglose para
// que el admin sepa cuáles eventos quedaron pendientes si algo falla.
export async function addAttendeesToAllEvents(
  eventIds: string[],
  emails: string[]
): Promise<{ ok: string[]; failed: { eventId: string; error: string }[]; skipped: string[] }> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });

  const results = await Promise.allSettled(
    eventIds.map(async (eventId) => {
      const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      const existing = res.data.attendees ?? [];
      const existingEmails = new Set(existing.map((a) => a.email));
      const nuevos = emails.filter((e) => !existingEmails.has(e));
      if (!nuevos.length) return { eventId, status: "skipped" as const };

      await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId,
        sendUpdates: "all",
        requestBody: {
          attendees: [...existing, ...nuevos.map((email) => ({ email }))],
          guestsCanSeeOtherGuests: false,
          guestsCanInviteOthers: false,
        },
      });
      return { eventId, status: "ok" as const };
    }),
  );

  const ok: string[] = [];
  const failed: { eventId: string; error: string }[] = [];
  const skipped: string[] = [];

  results.forEach((r, i) => {
    const eventId = eventIds[i];
    if (r.status === "fulfilled") {
      if (r.value.status === "ok") ok.push(eventId);
      else skipped.push(eventId);
    } else {
      failed.push({
        eventId,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
    }
  });

  return { ok, failed, skipped };
}

// Elimina un attendee de todos los eventos del programa
export async function removeAttendeeFromAllEvents(eventIds: string[], email: string): Promise<void> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });

  await Promise.allSettled(
    eventIds.map(async (eventId) => {
      const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      const attendees = (res.data.attendees ?? []).filter((a) => a.email !== email);
      await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId,
        sendUpdates: "none", // no notificar al removido
        requestBody: { attendees },
      });
    })
  );
}

// Actualiza título, descripción y/o fecha de un evento existente
export async function updateCalendarEvent(eventId: string, data: {
  titulo?: string;
  descripcion?: string;
  fecha?: string;
  duracionMinutos?: number;
}): Promise<void> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });

  const patch: Record<string, unknown> = {};
  if (data.titulo) patch.summary = data.titulo;
  if (data.descripcion !== undefined) patch.description = data.descripcion;
  if (data.fecha) {
    const start = new Date(data.fecha);
    const end = new Date(start.getTime() + (data.duracionMinutos ?? 90) * 60_000);
    patch.start = { dateTime: start.toISOString(), timeZone: TZ };
    patch.end = { dateTime: end.toISOString(), timeZone: TZ };
  }

  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    sendUpdates: "all", // notifica a los asistentes si cambia la fecha
    requestBody: patch,
  });
}

// Crea un calendario dedicado para el programa (solo se ejecuta una vez)
export async function createProgramCalendar(name: string): Promise<string> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });
  const res = await calendar.calendars.insert({
    requestBody: { summary: name, timeZone: TZ },
  });
  return res.data.id!;
}

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

// Crea un evento en Google Calendar SIN Google Meet.
// El equipo usa Streamyard como plataforma real de streaming; el link se pone
// en `url_live` (Airtable) y se antepone a la descripción del evento vía
// buildDescription() más abajo. Meet no aplica y confundía a los Founders.
export async function createCalendarEvent(data: {
  titulo: string;
  descripcion?: string;
  fecha: string; // ISO string
  duracionMinutos?: number;
  urlLive?: string; // se antepone a la descripción como "🔴 EN VIVO: <url>"
}): Promise<CalendarEventResult> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });

  const start = new Date(data.fecha);
  const end = new Date(start.getTime() + (data.duracionMinutos ?? 90) * 60_000);

  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: data.titulo,
      description: buildDescription(data.urlLive, data.descripcion),
      start: { dateTime: start.toISOString(), timeZone: TZ },
      end: { dateTime: end.toISOString(), timeZone: TZ },
      guestsCanSeeOtherGuests: false,
      guestsCanInviteOthers: false,
    },
  });

  const event = res.data;

  return {
    eventId: event.id!,
    meetLink: "", // ya no se genera Meet
    htmlLink: event.htmlLink ?? "",
  };
}

// Antepone el link de Streamyard a la descripción para que los Founders vean
// dónde conectarse. Si no hay url_live todavía, deja solo la descripción.
export function buildDescription(urlLive?: string, descripcion?: string): string {
  const desc = descripcion?.trim() ?? "";
  if (!urlLive?.trim()) return desc;
  return `🔴 EN VIVO: ${urlLive.trim()}\n\n${desc}`.trim();
}

// Extrae el URL que sigue a "🔴 EN VIVO: " en la primera linea de una descripcion.
// Retorna null si no hay linea EN VIVO. Sirve para detectar cambios de link
// (aparicion, desaparicion o cambio de URL) en el diff de upsertCalendarEvent.
export function extractLiveUrl(description: string): string | null {
  const m = description.match(/^🔴 EN VIVO:\s*(\S+)/);
  return m ? m[1] : null;
}

// Agrega en UN SOLO patch los attendees que falten en un evento ya cargado.
// Recibe la lista de attendees actual (del GET que hizo el caller) para no
// re-fetchear, calcula el delta y patchea una sola vez.
//
// Por qué un solo patch y no N: Google Calendar no tiene "add attendee" — cada
// patch reemplaza el array completo. Si se hacen N patches concurrentes, cada
// uno leyó el mismo estado inicial y escribe "previos + yo", pisándose entre sí
// (el último gana y borra a los demás). Además N patches disparan rateLimit.
// Un solo patch con [...existentes, ...faltantes] es atómico y no rate-limitea.
//
// sendUpdates:"all" → Google solo notifica a los attendees agregados en el diff,
// no re-molesta a los que ya estaban. Devuelve cuántos se agregaron.
export async function ensureAttendees(
  eventId: string,
  currentAttendees: { email?: string | null }[],
  emailsToEnsure: string[],
): Promise<number> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });
  const existingEmails = new Set(
    currentAttendees.map((a) => (a.email ?? "").toLowerCase()).filter(Boolean),
  );
  const nuevos = emailsToEnsure.filter(
    (e) => e && !existingEmails.has(e.toLowerCase()),
  );
  if (!nuevos.length) return 0;

  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    sendUpdates: "all", // notifica solo a los recién agregados
    requestBody: {
      attendees: [...currentAttendees, ...nuevos.map((email) => ({ email }))],
      guestsCanSeeOtherGuests: false,
      guestsCanInviteOthers: false,
    },
  });
  return nuevos.length;
}

// Invita una lista de emails a UN SOLO evento: GET del evento + un patch con los
// faltantes (ensureAttendees). Idempotente: quien ya está no se re-notifica.
// Devuelve cuántos se agregaron realmente (0 si ya estaban todos). Lo usa el
// botón "Invitar a todos los founders a esta clase" del admin de calendario.
export async function inviteFoundersToEvent(
  eventId: string,
  emails: string[],
): Promise<{ added: number; total: number }> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });
  const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
  const added = await ensureAttendees(eventId, res.data.attendees ?? [], emails);
  return { added, total: emails.length };
}

// Sincroniza una lista de founders contra varios eventos: para cada evento hace
// GET + un solo PATCH con los faltantes (ensureAttendees). Procesa los eventos
// en SERIE con un pequeño delay para no rate-limitear Calendar API. Idempotente:
// re-correrlo no re-invita a quien ya está. Devuelve el desglose por evento.
//
// Lo usa el cron diario de sincronización de attendees. No quita a nadie.
export async function syncFoundersToEvents(
  eventIds: string[],
  emails: string[],
  opts: { delayMs?: number } = {},
): Promise<{
  totalAdded: number;
  perEvent: { eventId: string; added: number; error?: string }[];
}> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });
  const delayMs = opts.delayMs ?? 1200;
  const perEvent: { eventId: string; added: number; error?: string }[] = [];
  let totalAdded = 0;

  for (let i = 0; i < eventIds.length; i++) {
    const eventId = eventIds[i];
    try {
      const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      const added = await ensureAttendees(eventId, res.data.attendees ?? [], emails);
      totalAdded += added;
      perEvent.push({ eventId, added });
    } catch (err) {
      perEvent.push({
        eventId,
        added: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    if (i < eventIds.length - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { totalAdded, perEvent };
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

// Lee los attendees actuales de varios eventos y devuelve el set único de emails
// (en minúsculas) presentes en al menos un evento, junto con el detalle por email
// de en cuántos/cuáles eventos aparece. Lo usa el reconciliador para detectar a
// quién hay que SACAR (está en el calendario pero ya no tiene portal_access).
// Procesa en serie con delay para no rate-limitear Calendar API.
export async function getAttendeesAcrossEvents(
  eventIds: string[],
  opts: { delayMs?: number } = {},
): Promise<{
  emails: string[]; // set único, minúsculas
  byEmail: Map<string, string[]>; // email → eventIds donde aparece
  errors: { eventId: string; error: string }[];
}> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });
  const delayMs = opts.delayMs ?? 300;
  const byEmail = new Map<string, string[]>();
  const errors: { eventId: string; error: string }[] = [];

  for (let i = 0; i < eventIds.length; i++) {
    const eventId = eventIds[i];
    try {
      const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      for (const a of res.data.attendees ?? []) {
        const email = (a.email ?? "").toLowerCase();
        if (!email) continue;
        const list = byEmail.get(email) ?? [];
        list.push(eventId);
        byEmail.set(email, list);
      }
    } catch (err) {
      errors.push({ eventId, error: err instanceof Error ? err.message : String(err) });
    }
    if (i < eventIds.length - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { emails: [...byEmail.keys()], byEmail, errors };
}

// Elimina un attendee de todos los eventos del programa
export async function removeAttendeeFromAllEvents(eventIds: string[], email: string): Promise<void> {
  await removeAttendeesFromAllEvents(eventIds, [email]);
}

// Quita VARIOS emails de varios eventos, en SERIE y con un solo PATCH por evento.
//
// Por qué serie + un patch (no Promise.all ni un patch por email):
//   - Google Calendar rate-limitea 30 GET+PATCH concurrentes; allSettled tragaba
//     los errores en silencio (el fix reportaba "sacado" sin sacar nada — OP-1939).
//   - Llamar removeAttendee 1×por-email sobre el mismo evento dispara patches
//     concurrentes que hacen GET de la lista vieja y se pisan: el último PATCH
//     re-agrega a quien otro acababa de sacar. Mismo patrón que el fix OP-1881
//     (attendees: un solo patch) y el fan-out serial de Gmail (OP-1914).
//   - Comparación case-insensitive: el casing del email en Calendar puede diferir
//     del de Airtable; `!==` exacto dejaba al attendee dentro.
//
// Idempotente. Devuelve el desglose por evento (cuántos se quitaron / error).
export async function removeAttendeesFromAllEvents(
  eventIds: string[],
  emails: string[],
  opts: { delayMs?: number } = {},
): Promise<{ totalRemoved: number; perEvent: { eventId: string; removed: number; error?: string }[] }> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });
  const delayMs = opts.delayMs ?? 500;
  const drop = new Set(emails.map((e) => e.toLowerCase()));
  const perEvent: { eventId: string; removed: number; error?: string }[] = [];
  let totalRemoved = 0;

  for (let i = 0; i < eventIds.length; i++) {
    const eventId = eventIds[i];
    try {
      const res = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      const attendees = res.data.attendees ?? [];
      const kept = attendees.filter((a) => !drop.has((a.email ?? "").toLowerCase()));
      const removed = attendees.length - kept.length;
      if (removed > 0) {
        await calendar.events.patch({
          calendarId: CALENDAR_ID,
          eventId,
          sendUpdates: "none", // no notificar a los removidos
          requestBody: { attendees: kept },
        });
        totalRemoved += removed;
      }
      perEvent.push({ eventId, removed });
    } catch (err) {
      perEvent.push({ eventId, removed: 0, error: err instanceof Error ? err.message : String(err) });
    }
    if (i < eventIds.length - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { totalRemoved, perEvent };
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

// ─── Upsert con diff (usado por el webhook clase-upsert) ──────────────────────

export interface UpsertCalendarInput {
  eventId?: string; // si viene, intenta UPDATE; si no, CREATE
  titulo: string;
  descripcion?: string;
  fecha: string; // ISO
  duracionMinutos?: number;
  // URL de Streamyard. Se antepone a la descripción como "🔴 EN VIVO: ...".
  urlLive?: string;
  // Emails a agregar como attendees. Solo agrega los nuevos (no quita a nadie).
  attendeeEmails?: string[];
}

export interface UpsertCalendarResult {
  eventId: string;
  meetLink: string;
  htmlLink: string;
  action: "created" | "updated" | "noop";
  // Cuáles campos cambiaron (vacío si action === "noop")
  changedFields: string[];
  // Cuántos attendees nuevos se agregaron
  attendeesAdded: number;
}

// Decide si dos strings de fecha apuntan al mismo instante (con tolerancia
// de 1 segundo para evitar falsos positivos por redondeo de ms).
function sameInstant(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return a === b;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.abs(da - db) < 1000;
}

// Upsert idempotente: si no hay eventId crea; si hay eventId y los campos
// materiales no cambiaron, no llama a Calendar (noop). Si cambiaron, hace
// update con sendUpdates dependiendo de la materialidad.
//
// Attendees (data.attendeeEmails):
//   - Se sincronizan en CREATE y en UPDATE: cada upsert asegura que todos los
//     emails pasados estén invitados, agregando solo los que falten en UN solo
//     patch (ensureAttendees). Así los founders que se suman después de crear
//     el evento entran en el siguiente upsert.
//   - Nunca quita attendees — el churn vive en removeAttendeeFromAllEvents.
//   - Si data.attendeeEmails viene vacío/undefined, no toca la lista.
//
// Materialidad de campos (afecta sendUpdates):
//   - hora/fecha → cambio MATERIAL → sendUpdates: 'all' (notifica a Founders)
//   - cancelación → MATERIAL
//   - título → MATERIAL (sale en el invite)
//   - descripción → NO material por sí solo → sendUpdates: 'none'
export async function upsertCalendarEvent(
  data: UpsertCalendarInput,
): Promise<UpsertCalendarResult> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });
  const start = new Date(data.fecha);
  const end = new Date(start.getTime() + (data.duracionMinutos ?? 90) * 60_000);

  // CREATE path
  if (!data.eventId) {
    const created = await createCalendarEvent({
      titulo: data.titulo,
      descripcion: data.descripcion,
      fecha: data.fecha,
      duracionMinutos: data.duracionMinutos,
      urlLive: data.urlLive,
    });

    // Un solo patch con TODOS los founders (no N patches concurrentes que se
    // pisan y rate-limitean). El evento recién creado no tiene attendees, así
    // que el estado base es [].
    let attendeesAdded = 0;
    if (data.attendeeEmails?.length) {
      attendeesAdded = await ensureAttendees(created.eventId, [], data.attendeeEmails);
    }

    return {
      eventId: created.eventId,
      meetLink: created.meetLink,
      htmlLink: created.htmlLink,
      action: "created",
      changedFields: ["created"],
      attendeesAdded,
    };
  }

  // UPDATE path — primero fetch para diff
  const current = await calendar.events.get({ calendarId: CALENDAR_ID, eventId: data.eventId });
  const ev = current.data;

  const changedFields: string[] = [];
  const patch: Record<string, unknown> = {};

  if (ev.summary !== data.titulo) {
    patch.summary = data.titulo;
    changedFields.push("titulo");
  }

  const newDesc = buildDescription(data.urlLive, data.descripcion);
  if ((ev.description ?? "") !== newDesc) {
    patch.description = newDesc;
    // El url_live va como primera linea "🔴 EN VIVO: <url>". Si esa linea cambio
    // (aparecio, desaparecio, o el URL es otro), es MATERIAL — hay que avisar a
    // los founders porque llegarian al link viejo. Solo si el link es identico y
    // cambio el texto de descripcion, no notificamos.
    const currentLive = extractLiveUrl(ev.description ?? "");
    const newLive = extractLiveUrl(newDesc);
    if (currentLive !== newLive) {
      changedFields.push("url_live");
    } else {
      changedFields.push("descripcion");
    }
  }

  const currentStart = ev.start?.dateTime ?? ev.start?.date;
  const currentEnd = ev.end?.dateTime ?? ev.end?.date;
  const fechaCambio = !sameInstant(currentStart, start.toISOString());
  const finCambio = !sameInstant(currentEnd, end.toISOString());
  if (fechaCambio || finCambio) {
    patch.start = { dateTime: start.toISOString(), timeZone: TZ };
    patch.end = { dateTime: end.toISOString(), timeZone: TZ };
    changedFields.push("fecha");
  }

  // ¿Es material? SOLO el cambio de fecha/hora notifica a los founders (WI-1819).
  // Título, url_live y descripción siguen patcheando el evento para que el Calendar
  // quede actualizado, pero con sendUpdates:"none" — editar el título o el link de
  // Streamyard NO debe mandarle un email de "evento actualizado" a los ~26 founders.
  const isMaterial = changedFields.includes("fecha");

  const meetLink =
    ev.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ?? "";

  // Sincroniza attendees faltantes en UPDATE (patch aparte de los campos).
  // Antes NO se tocaban attendees en update, lo que dejaba fuera a los founders
  // que se sumaban después de crear el evento. Ahora cada upsert asegura que
  // TODOS los founders pasados estén invitados. Solo agrega los que faltan; no
  // quita a nadie (churn vive en removeAttendeeFromAllEvents). Es un patch
  // separado para no mezclar la notificación de attendees con la de campos.
  const attendeesAdded = data.attendeeEmails?.length
    ? await ensureAttendees(data.eventId, ev.attendees ?? [], data.attendeeEmails)
    : 0;

  // Si no cambió ningún campo material/no-material → noop (aunque haya podido
  // agregar attendees arriba; eso se refleja en attendeesAdded).
  if (Object.keys(patch).length === 0) {
    return {
      eventId: data.eventId,
      meetLink,
      htmlLink: ev.htmlLink ?? "",
      action: attendeesAdded > 0 ? "updated" : "noop",
      changedFields,
      attendeesAdded,
    };
  }

  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId: data.eventId,
    sendUpdates: isMaterial ? "all" : "none",
    requestBody: patch,
  });

  return {
    eventId: data.eventId,
    meetLink,
    htmlLink: ev.htmlLink ?? "",
    action: "updated",
    changedFields,
    attendeesAdded,
  };
}

// Crea un calendario dedicado para el programa (solo se ejecuta una vez)
export async function createProgramCalendar(name: string): Promise<string> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() });
  const res = await calendar.calendars.insert({
    requestBody: { summary: name, timeZone: TZ },
  });
  return res.data.id!;
}

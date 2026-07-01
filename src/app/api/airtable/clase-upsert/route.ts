export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  getClaseByIdFresh,
  getAllFoundersWithAccess,
  updateClase,
} from "@/lib/airtable";
import { upsertCalendarEvent } from "@/lib/calendar";

// POST /api/airtable/clase-upsert
//
// Webhook que Airtable Automations dispara cuando se marca el checkbox
// `listo_publicar` en un registro de la tabla `Clases MF26`.
//
// Comportamiento:
//   - Gate: si listo_publicar = false, responde {skipped} sin tocar Calendar.
//   - Crea evento Founders + Equipo si no existen (e invita a todos los Founders
//     activos SOLO en este momento de creación).
//   - Si ya existen → diff: solo patchea si cambió título/fecha/descripción.
//     NO toca attendees en updates (eso lo hace el flujo de inscripción/churn).
//     sendUpdates: 'all' si cambia título o fecha. Descripción sola → 'none'.
//   - Auto-off TEMPRANO: apenas pasa el gate, escribe listo_publicar = false
//     en Airtable ANTES de tocar Calendar. Sirve dos propósitos:
//     1) El checkbox se comporta como "botón de publicar" (para republicar,
//        volver a marcar — con diff es seguro).
//     2) Cross-process lock: si Airtable Automations retryea el webhook o
//        Vercel lanza dos handlers en paralelo, el segundo lee listo_publicar
//        = false por el gate y responde skipped en vez de duplicar eventos.
//   - Lock in-memory adicional por recordId contra retries dentro del mismo
//     proceso serverless.
//
// Modo prueba:
//   - Si el body trae `testEmail: "alguien@x.com"`, el endpoint IGNORA la
//     lista de Founders activos y usa solo ese email como attendee. Sirve
//     para validar el flujo end-to-end sin invitar a todos los Founders.
//     Tras validar, quitar el `testEmail` del payload de la Automation.
//
// Setup en Airtable (UI): ver docs/setup-airtable-webhook-clases.md sección 7.
//
// Seguridad: shared secret en env var AIRTABLE_WEBHOOK_SECRET.

const FOUNDERS_EVENT_TITLE_PREFIX = "";
const TEAM_EVENT_TITLE_PREFIX = "[VIP] ";

// Lock in-memory por recordId. Airtable Automations puede retryar o mandar el
// mismo evento dos veces con milisegundos de diferencia. Como el flujo hace
// getFresh() → create Calendar → persistID, sin un lock la segunda petición
// también lee calendar_event_id="" y crea un evento duplicado.
//
// Este Map cubre el caso del MISMO proceso serverless (>90% en Vercel para
// requests seguidos). Complemento con auto-off temprano de listo_publicar al
// principio del handler para cubrir cross-process.
const inflightLocks = new Map<string, number>();
const LOCK_TTL_MS = 30_000;

function acquireLock(recordId: string): boolean {
  const now = Date.now();
  const existing = inflightLocks.get(recordId);
  if (existing && now - existing < LOCK_TTL_MS) return false;
  inflightLocks.set(recordId, now);
  return true;
}

function releaseLock(recordId: string) {
  inflightLocks.delete(recordId);
}

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.AIRTABLE_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error("[clase-upsert] AIRTABLE_WEBHOOK_SECRET no configurado");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: { secret?: string; recordId?: string; testEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.secret !== expectedSecret) {
    console.warn("[clase-upsert] secret incorrecto");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recordId = body.recordId?.trim();
  if (!recordId) {
    return NextResponse.json({ error: "recordId required" }, { status: 400 });
  }

  // ─── Lock in-memory (mismo proceso Vercel) ───────────────────────────────
  if (!acquireLock(recordId)) {
    console.warn(`[clase-upsert] lock activo para ${recordId} — request duplicado ignorado`);
    return NextResponse.json({
      ok: true,
      skipped: "otra ejecución del mismo recordId en progreso",
      recordId,
    });
  }

  try {
    return await handleUpsert(recordId, body.testEmail);
  } finally {
    releaseLock(recordId);
  }
}

async function handleUpsert(
  recordId: string,
  testEmailRaw?: string,
): Promise<NextResponse> {
  const clase = await getClaseByIdFresh(recordId);
  if (!clase) {
    return NextResponse.json({ error: "Clase not found" }, { status: 404 });
  }

  // ─── Gate ────────────────────────────────────────────────────────────────
  if (!clase.listo_publicar) {
    return NextResponse.json({
      ok: true,
      skipped: "listo_publicar = false — el editor sigue en draft",
      recordId,
    });
  }

  if (!clase.titulo || !clase.fecha) {
    return NextResponse.json({
      ok: false,
      error: "Clase marcada como lista pero falta titulo o fecha",
      recordId,
    }, { status: 400 });
  }

  // ─── Auto-off TEMPRANO del checkbox (cross-process lock) ──────────────────
  // Escribimos listo_publicar = false ANTES de tocar Calendar. Si Airtable
  // Automations retryea a otro proceso Vercel, la segunda petición leerá
  // listo_publicar = false por el gate de arriba y responderá skipped.
  await updateClase(recordId, { listo_publicar: false }).catch((e) => {
    console.error("[clase-upsert] early auto-off fail:", e instanceof Error ? e.message : e);
  });

  // ─── Founders activos (solo se usan si el evento se crea por primera vez) ─
  // Modo prueba: si viene testEmail, usamos solo ese (no resolvemos Founders).
  const isFoundersCreating = !clase.calendar_event_id;
  const testEmail = testEmailRaw?.trim();
  const founderEmails = isFoundersCreating
    ? testEmail
      ? [testEmail]
      : (await getAllFoundersWithAccess()).map((f) => f.email)
    : undefined;

  // ─── Founders event ──────────────────────────────────────────────────────
  // url_live = link de Streamyard público (donde ven los Founders).
  const foundersResult = await upsertCalendarEvent({
    eventId: clase.calendar_event_id,
    titulo: `${FOUNDERS_EVENT_TITLE_PREFIX}${clase.titulo}`,
    descripcion: clase.descripcion,
    fecha: clase.fecha,
    duracionMinutos: clase.duracion_minutos,
    urlLive: clase.url_live,
    attendeeEmails: founderEmails,
  }).catch((e) => {
    console.error("[clase-upsert] founders upsert fail:", e instanceof Error ? e.message : e);
    return null;
  });

  // ─── Team event (sin attendees Founder, jamás) ───────────────────────────
  // url_live_team = link interno del equipo (Streamyard studio u otro).
  const teamResult = await upsertCalendarEvent({
    eventId: clase.calendar_event_id_team,
    titulo: `${TEAM_EVENT_TITLE_PREFIX}${clase.titulo}`,
    descripcion: clase.descripcion,
    fecha: clase.fecha,
    duracionMinutos: clase.duracion_minutos,
    urlLive: clase.url_live_team,
  }).catch((e) => {
    console.error("[clase-upsert] team upsert fail:", e instanceof Error ? e.message : e);
    return null;
  });

  // ─── Persistir IDs nuevos en Airtable ────────────────────────────────────
  // El auto-off del checkbox ya se hizo arriba (temprano) para evitar la
  // race condition de dobles disparos.
  const persistFields: Record<string, unknown> = {};
  if (foundersResult?.action === "created" && !clase.calendar_event_id) {
    persistFields.calendar_event_id = foundersResult.eventId;
  }
  if (teamResult?.action === "created" && !clase.calendar_event_id_team) {
    persistFields.calendar_event_id_team = teamResult.eventId;
  }
  if (Object.keys(persistFields).length) {
    await updateClase(recordId, persistFields).catch((e) => {
      console.error("[clase-upsert] persist ids fail:", e instanceof Error ? e.message : e);
    });
  }

  revalidateTag("clases-content", { expire: 0 });

  return NextResponse.json({
    ok: !!(foundersResult && teamResult),
    recordId,
    titulo: clase.titulo,
    fecha: clase.fecha,
    testMode: testEmail ? `enabled (only ${testEmail} invited)` : undefined,
    checkboxResetToFalse: !!(foundersResult && teamResult),
    founders: foundersResult
      ? {
          eventId: foundersResult.eventId,
          action: foundersResult.action,
          changedFields: foundersResult.changedFields,
          attendeesAdded: foundersResult.attendeesAdded,
        }
      : { error: "founders upsert failed" },
    team: teamResult
      ? {
          eventId: teamResult.eventId,
          action: teamResult.action,
          changedFields: teamResult.changedFields,
        }
      : { error: "team upsert failed" },
  });
}

export const dynamic = "force-dynamic";
export const maxDuration = 300; // sincroniza N eventos en serie con delay

import { NextRequest, NextResponse } from "next/server";
import { getAllFoundersWithAccess, getUpcomingClaseEventIds } from "@/lib/airtable";
import { syncFoundersToEvents } from "@/lib/calendar";

// POST /api/cron/sync-attendees
//
// Red de seguridad diaria: asegura que TODOS los founders activos
// (portal_access=1) estén invitados a TODAS las clases futuras. Atrapa a los
// founders que se sumaron después de crear los eventos y que ningún otro flujo
// llegó a incorporar (el webhook clase-upsert solo sincroniza cuando alguien
// re-guarda la clase; el drip de inscripción solo mete a S1/S2).
//
// Para cada evento futuro hace GET + un solo PATCH con los faltantes
// (syncFoundersToEvents → ensureAttendees). Idempotente: si todos ya están,
// no toca nada y no manda correos. Solo agrega, nunca quita (el churn vive en
// removeAttendeeFromAllEvents, disparado por baja del programa).
//
// Body (opcional):
//   { dryRun?: boolean }   // dryRun: reporta faltantes sin patchear ni enviar
//
// Auth: Authorization: Bearer <CRON_SECRET>.
//
// Programación: n8n (o Vercel Cron) lo dispara 1 vez al día. Ver
// docs/setup-airtable-webhook-clases.md / la config de n8n.

const CRON_SECRET = process.env.CRON_SECRET ?? "";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { dryRun?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // body vacío está bien — dryRun default false
  }
  const dryRun = body.dryRun === true;

  const [founders, eventos] = await Promise.all([
    getAllFoundersWithAccess(),
    getUpcomingClaseEventIds(),
  ]);
  const emails = founders.map((f) => f.email).filter(Boolean);

  if (!emails.length || !eventos.length) {
    return NextResponse.json({
      ok: true,
      skipped: `nada que sincronizar (founders=${emails.length}, eventos futuros=${eventos.length})`,
    });
  }

  // Dry-run: reporta cuántos faltarían por evento sin tocar Calendar.
  // No hace GET a Calendar (para ser barato); solo confirma alcance.
  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      foundersActivos: emails.length,
      eventosFuturos: eventos.length,
      eventos: eventos.map((e) => ({ titulo: e.titulo, fecha: e.fecha, eventId: e.eventId })),
      nota: "dryRun no consulta Calendar; ejecuta sin dryRun para el desglose real de faltantes",
    });
  }

  const eventIds = eventos.map((e) => e.eventId);
  const result = await syncFoundersToEvents(eventIds, emails);

  // Mapea el desglose por evento a títulos legibles para el log/respuesta.
  const byEventId = new Map(eventos.map((e) => [e.eventId, e]));
  const detalle = result.perEvent
    .filter((r) => r.added > 0 || r.error)
    .map((r) => ({
      titulo: byEventId.get(r.eventId)?.titulo ?? r.eventId,
      added: r.added,
      error: r.error,
    }));

  const fallidos = result.perEvent.filter((r) => r.error).length;

  return NextResponse.json({
    ok: fallidos === 0,
    foundersActivos: emails.length,
    eventosFuturos: eventos.length,
    invitacionesAgregadas: result.totalAdded,
    eventosConCambios: detalle.filter((d) => d.added > 0).length,
    eventosFallidos: fallidos,
    detalle,
  });
}

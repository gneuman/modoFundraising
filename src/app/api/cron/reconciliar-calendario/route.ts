export const dynamic = "force-dynamic";
export const maxDuration = 300; // lee N eventos en serie con delay

import { NextRequest, NextResponse } from "next/server";
import {
  getAllFounderEmailsWithAccessFlag,
  getUpcomingClaseEventIds,
} from "@/lib/airtable";
import { getAttendeesAcrossEvents, removeAttendeesFromAllEvents } from "@/lib/calendar";

// POST /api/cron/reconciliar-calendario
//
// Red de seguridad complementaria a sync-attendees. Mientras sync-attendees SOLO
// AGREGA (mete a los founders con portal_access a las clases futuras), este cron
// SOLO QUITA: saca del calendario a cualquiera que esté invitado a las clases
// futuras pero YA NO tenga portal_access=1.
//
// Nace de OP-1939: founders que salieron del programa por rutas que no limpian el
// flag (rechazo por founder, "Money Back", etc.) quedaban con portal_access sucio
// y el cron de invitación los reinvitaba a diario. Aquí se cierra el otro lado.
//
// Fuente de verdad: portal_access del Founder. Se saca del calendario a quien:
//   (1) SÍ es founder (existe en la tabla Founders), Y
//   (2) tiene portal_access=false.
// A un attendee que NO es founder (staff, instructor, organizador, invitado
// externo) NUNCA se le toca — así el cron no puede desinvitar por error a alguien
// que legítimamente no está en Founders.
//
// SOLO toca Google Calendar: no cancela Stripe, no cambia status, no manda emails.
//
// Body (opcional): { dryRun?: boolean }  // reporta a quién sacaría sin tocar nada
// Auth: Authorization: Bearer <CRON_SECRET>
// Programación: n8n cada 4 horas.

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
    // body vacío → dryRun default false
  }
  const dryRun = body.dryRun === true;

  const [allFounders, eventos] = await Promise.all([
    getAllFounderEmailsWithAccessFlag(),
    getUpcomingClaseEventIds(),
  ]);

  const eventIds = eventos.map((e) => e.eventId).filter(Boolean);
  if (!eventIds.length) {
    return NextResponse.json({ ok: true, skipped: "no hay clases futuras" });
  }

  // Mapa email → portal_access de TODOS los founders (para distinguir founder de
  // no-founder, y founder-con-acceso de founder-sin-acceso).
  const founderAccess = new Map<string, boolean>();
  for (const f of allFounders) founderAccess.set(f.email, f.portalAccess);
  const conAcceso = allFounders.filter((f) => f.portalAccess).length;

  // Attendees reales del calendario en las clases futuras.
  const { byEmail, errors } = await getAttendeesAcrossEvents(eventIds);

  // A sacar: es founder (existe en el mapa) Y su portal_access es false.
  // Los no-founders (no están en el mapa) se ignoran por completo.
  const aSacar = [...byEmail.keys()].filter(
    (email) => founderAccess.get(email) === false,
  );

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      foundersConAcceso: conAcceso,
      eventosFuturos: eventIds.length,
      attendeesUnicos: byEmail.size,
      aSacar: aSacar.map((email) => ({ email, eventos: byEmail.get(email)?.length ?? 0 })),
      lecturaErrores: errors.length,
    });
  }

  // Aplicar: sacar a todos los founders sin acceso en un solo barrido serial
  // (un PATCH por evento con todos los emails). Ver removeAttendeesFromAllEvents:
  // los removes concurrentes por-email se pisaban y dejaban gente dentro.
  const { totalRemoved, perEvent } = aSacar.length
    ? await removeAttendeesFromAllEvents(eventIds, aSacar)
    : { totalRemoved: 0, perEvent: [] };
  const eventosConError = perEvent.filter((e) => e.error);

  return NextResponse.json({
    ok: eventosConError.length === 0,
    foundersConAcceso: conAcceso,
    eventosFuturos: eventIds.length,
    attendeesUnicos: byEmail.size,
    removidos: aSacar,
    attendeeEventosRemovidos: totalRemoved,
    eventosConError: eventosConError.length,
    lecturaErrores: errors.length,
  });
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import {
  getCalendarEventIds,
  getFutureCalendarEventIds,
  getTeamCalendarEventIds,
  getUpcomingClaseEventIds,
} from "@/lib/airtable";
import { addAttendeesToAllEvents, removeAttendeeFromAllEvents } from "@/lib/calendar";
import { sendOnboardingEmail } from "@/lib/email-engine";

// POST /api/admin/calendar/test
// Acciones de QA contra uno o varios emails arbitrarios, SIN tocar Airtable / portal_access.
// Body: { email?: string; emails?: string[]; nombre?: string; action: "invite" | "remove" | "onboarding"; audience?: "founders" | "futuras" | "team" | "both" }
//   - invite: agrega el/los email(s) como attendee a los eventos de la audiencia (idempotente).
//   - remove: los quita de todos los eventos.
//   - onboarding: dispara el correo de onboarding manualmente (solo al primer email).
// Audiencias para invite:
//   - "founders": solo S1 y S2 (drip estándar, decisión de Gabriel 2026-06-29).
//   - "futuras": TODAS las clases futuras de hoy en adelante (para invitados externos como equipo/mentores).
//   - "team": eventos de equipo.
//   - "both": founders (S1/S2) + team.
// Default audience = "founders".
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  let body: { email?: string; emails?: string[]; nombre?: string; action?: string; audience?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Acepta un email suelto o una lista. Normaliza (trim + lowercase), quita vacíos y duplica.
  const rawEmails = body.emails?.length ? body.emails : body.email ? [body.email] : [];
  const emails = [...new Set(rawEmails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const action = body.action;
  const audience = body.audience ?? "founders";

  if (!emails.length) {
    return NextResponse.json({ error: "Pegá al menos un email" }, { status: 400 });
  }
  const invalid = emails.filter((e) => !/.+@.+\..+/.test(e));
  if (invalid.length) {
    return NextResponse.json({ error: `Email(s) inválido(s): ${invalid.join(", ")}` }, { status: 400 });
  }
  if (!action || !["invite", "remove", "onboarding"].includes(action)) {
    return NextResponse.json({ error: "action debe ser invite | remove | onboarding" }, { status: 400 });
  }

  if (action === "onboarding") {
    const portalUrl = `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/portal`;
    try {
      await sendOnboardingEmail(emails[0], body.nombre || "founder", portalUrl);
      return NextResponse.json({ ok: true, action, to: emails[0], portalUrl });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // invite / remove → resolver event ids según audiencia.
  // invite "founders": solo S1 y S2. invite "futuras": todas las clases de hoy en adelante.
  // remove: TODOS los eventos (queremos sacar al churn de cualquier clase, pasada o futura).
  const wantsFounders = audience === "founders" || audience === "both";
  const wantsFuturas = audience === "futuras";
  const wantsTeam = audience === "team" || audience === "both";

  const founderEventIdsFn = action === "invite" ? getFutureCalendarEventIds : getCalendarEventIds;
  const [mainIds, futurasIds, teamIds] = await Promise.all([
    wantsFounders ? founderEventIdsFn() : Promise.resolve([]),
    // "futuras" solo aplica a invite; en remove no tiene sentido (remove barre TODOS con getCalendarEventIds).
    wantsFuturas && action === "invite"
      ? getUpcomingClaseEventIds().then((cs) => cs.map((c) => c.eventId))
      : wantsFuturas
        ? getCalendarEventIds()
        : Promise.resolve([]),
    wantsTeam ? getTeamCalendarEventIds() : Promise.resolve([]),
  ]);
  const eventIds = [...new Set([...mainIds, ...futurasIds, ...teamIds])];

  if (!eventIds.length) {
    return NextResponse.json(
      { error: "No hay eventos de Calendar para esa audiencia. Agendá las clases primero." },
      { status: 400 }
    );
  }

  try {
    let breakdownAdded: { ok: number; failed: number; skipped: number } | undefined;
    if (action === "invite") {
      const result = await addAttendeesToAllEvents(eventIds, emails);
      breakdownAdded = { ok: result.ok.length, failed: result.failed.length, skipped: result.skipped.length };
    } else {
      // remove acepta varios emails: los quitamos uno por uno (removeAttendeeFromAllEvents es por email).
      for (const e of emails) await removeAttendeeFromAllEvents(eventIds, e);
    }
    return NextResponse.json({
      ok: true,
      action,
      audience,
      to: emails,
      count: emails.length,
      events: eventIds.length,
      breakdown: { founders: mainIds.length, futuras: futurasIds.length, team: teamIds.length },
      eventsResult: breakdownAdded,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

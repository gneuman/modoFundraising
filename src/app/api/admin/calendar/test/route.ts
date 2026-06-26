export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getCalendarEventIds, getTeamCalendarEventIds } from "@/lib/airtable";
import { addAttendeesToAllEvents, removeAttendeeFromAllEvents } from "@/lib/calendar";
import { sendOnboardingEmail } from "@/lib/email-engine";

// POST /api/admin/calendar/test
// Acciones de QA contra un email arbitrario, SIN tocar Airtable / portal_access.
// Body: { email: string; nombre?: string; action: "invite" | "remove" | "onboarding"; audience?: "founders" | "team" | "both" }
//   - invite: agrega el email como attendee a todos los eventos (idempotente).
//   - remove: lo quita de todos los eventos.
//   - onboarding: dispara el correo de onboarding manualmente.
// Default audience = "founders" (eventos principales).
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  let body: { email?: string; nombre?: string; action?: string; audience?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const action = body.action;
  const audience = body.audience ?? "founders";

  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  if (!action || !["invite", "remove", "onboarding"].includes(action)) {
    return NextResponse.json({ error: "action debe ser invite | remove | onboarding" }, { status: 400 });
  }

  if (action === "onboarding") {
    const portalUrl = `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/portal`;
    try {
      await sendOnboardingEmail(email, body.nombre || "founder", portalUrl);
      return NextResponse.json({ ok: true, action, to: email, portalUrl });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // invite / remove → resolver event ids según audiencia
  const wantsFounders = audience === "founders" || audience === "both";
  const wantsTeam = audience === "team" || audience === "both";

  const [mainIds, teamIds] = await Promise.all([
    wantsFounders ? getCalendarEventIds() : Promise.resolve([]),
    wantsTeam ? getTeamCalendarEventIds() : Promise.resolve([]),
  ]);
  const eventIds = [...mainIds, ...teamIds];

  if (!eventIds.length) {
    return NextResponse.json(
      { error: "No hay eventos de Calendar para esa audiencia. Agendá las clases primero." },
      { status: 400 }
    );
  }

  try {
    if (action === "invite") {
      await addAttendeesToAllEvents(eventIds, [email]);
    } else {
      await removeAttendeeFromAllEvents(eventIds, email);
    }
    return NextResponse.json({
      ok: true,
      action,
      audience,
      to: email,
      events: eventIds.length,
      breakdown: { founders: mainIds.length, team: teamIds.length },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

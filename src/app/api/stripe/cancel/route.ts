import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion, normalizarEmail } from "@/lib/auth";
import { cancelSubscription } from "@/lib/stripe";
import {
  getAllApplications,
  updateApplicationStatus,
  updateStartupStatus,
  deactivateAllFoundersForApplication,
  createRechazoRecord,
  getFounderEmailsByStartup,
  getCalendarEventIds,
  CHURN_REASON_LABELS,
  type ChurnReasonCode,
} from "@/lib/airtable";
import { sendChurnEmail } from "@/lib/email-engine";
import { removeAttendeeFromAllEvents } from "@/lib/calendar";

const VALID_REASONS: ChurnReasonCode[] = [
  "precio",
  "tiempo",
  "prioridades",
  "ronda_levantada",
  "no_esperado",
  "otro",
];

export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reasonCode = body?.reasonCode as ChurnReasonCode | undefined;
  const detail = typeof body?.detail === "string" ? body.detail.trim() : "";

  if (!reasonCode || !VALID_REASONS.includes(reasonCode)) {
    return NextResponse.json({ error: "Motivo requerido" }, { status: 400 });
  }
  if (reasonCode === "otro" && !detail) {
    return NextResponse.json({ error: "Especifica el motivo" }, { status: 400 });
  }

  const apps = await getAllApplications();
  const sessionEmail = normalizarEmail(session.email);
  const app = apps.find((a) => a.email && normalizarEmail(a.email) === sessionEmail);
  if (!app?.stripe_subscription_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  await cancelSubscription(app.stripe_subscription_id);

  const startupIds = (app.startup_record as string[] | undefined) ?? [];
  const founderIds = (app.founder_record as string[] | undefined) ?? [];

  // Obtener emails de founders ANTES de desactivar. Despues del deactivate,
  // getFounderEmailsByStartup filtra por portal_access=1 y devuelve vacio.
  const founderEmails = startupIds[0]
    ? await getFounderEmailsByStartup(startupIds[0]).catch(() => [] as string[])
    : [];

  await Promise.all([
    updateApplicationStatus(app.id!, "Churn By Founder", { portal_access: false }),
    deactivateAllFoundersForApplication(app.id!),
    startupIds[0] ? updateStartupStatus(startupIds[0], "Churn") : Promise.resolve(),
    createRechazoRecord({
      startupId: startupIds[0],
      postulacionId: app.id,
      founderId: founderIds[0],
      reasonCode,
      reasonLabel: CHURN_REASON_LABELS[reasonCode],
      detail: detail || undefined,
      email: app.email,
    }),
  ]);

  // Sacar a los founders de TODOS los eventos de Calendar (no solo S1/S2).
  // Churn = perdida total de acceso, incluyendo invitaciones ya enviadas.
  if (founderEmails.length) {
    try {
      const eventIds = await getCalendarEventIds();
      await Promise.allSettled(
        founderEmails.map((em) => removeAttendeeFromAllEvents(eventIds, em)),
      );
    } catch (err) {
      console.error(
        "[cancel] calendar remove error:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  await sendChurnEmail(app.email!, app.first_name!);

  return NextResponse.json({ success: true });
}

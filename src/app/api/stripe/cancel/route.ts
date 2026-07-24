import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion, normalizarEmail } from "@/lib/auth";
import { cancelSubscription, findCancelableSubscriptionByCustomer } from "@/lib/stripe";
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
import { sendChurnEmail, sendChurnTeamAlert } from "@/lib/email-engine";
import { removeAttendeesFromAllEvents } from "@/lib/calendar";

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
  if (!app) {
    return NextResponse.json({ error: "No application found" }, { status: 404 });
  }

  // Resolver la suscripción: primero el ID guardado en Airtable; si falta
  // (migración / webhook viejo — WI-1818), buscarla en Stripe por customer.
  let subscriptionId = app.stripe_subscription_id;
  if (!subscriptionId && app.stripe_customer_id) {
    subscriptionId = await findCancelableSubscriptionByCustomer(
      app.stripe_customer_id,
    ).catch(() => undefined) ?? undefined;
  }

  // Darse de baja del programa = churn. Dos casos:
  //  - Suscripción de cuotas: hay subscription en Stripe → cancelarla para
  //    detener cobros futuros y luego hacer el churn.
  //  - Pago único: NO hay subscription (mode=payment) → no hay nada que cancelar
  //    en Stripe, pero el founder igual puede salir del programa. Ya pagó
  //    completo y no hay reembolso automático; el UI se lo advierte antes.
  // En ambos casos se ejecuta el churn (perder acceso, salir de eventos, etc.).
  if (subscriptionId) {
    await cancelSubscription(subscriptionId);
  }

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
      await removeAttendeesFromAllEvents(eventIds, founderEmails);
    } catch (err) {
      console.error(
        "[cancel] calendar remove error:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  await sendChurnEmail(app.email!, app.first_name!);

  // Aviso interno al equipo de Impacta con la razón de la encuesta de baja.
  // No debe tumbar la respuesta si el correo falla (el churn ya se ejecutó).
  await sendChurnTeamAlert({
    firstName: app.first_name ?? undefined,
    email: app.email ?? undefined,
    startup: app.startup_name ?? undefined,
    reasonLabel: CHURN_REASON_LABELS[reasonCode],
    detail: detail || undefined,
  }).catch((err) => {
    console.error(
      "[cancel] churn team alert error:",
      err instanceof Error ? err.message : err,
    );
  });

  return NextResponse.json({ success: true });
}

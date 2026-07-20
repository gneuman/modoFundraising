import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import {
  getAllApplications,
  updateApplicationStatus,
  createPagoRecord,
  deactivateAllFoundersForApplication,
  getFounderEmailsByStartup,
  getCalendarEventIds,
  updateStartupStatus,
  statusOtorgaAcceso,
  type PaymentStatus,
  type PostulacionRecord,
} from "@/lib/airtable";
import {
  sendPaymentConfirmation,
  sendPaymentFailedEmail,
  sendChurnEmail,
  sendPortalDeactivatedEmail,
} from "@/lib/email-engine";
import { removeAttendeesFromAllEvents } from "@/lib/calendar";
import { activatePortalForStartup } from "@/lib/inscripcion";

// Resuelve la postulación de un invoice de Stripe con fallbacks en cascada para
// que la cobranza por webhook nunca falle en silencio:
//   1) por stripe_subscription_id (lo normal)
//   2) por stripe_customer_id  (si la sub no quedó guardada en Airtable)
//   3) por email del invoice    (último recurso)
// Si tras los 3 no hay match, loguea para dejar rastro (antes era un break mudo).
function matchAppForInvoice(
  apps: PostulacionRecord[],
  invoice: { subscription?: string; customer?: string; customer_email?: string },
  context: string,
): PostulacionRecord | null {
  let app = invoice.subscription
    ? apps.find((a) => a.stripe_subscription_id === invoice.subscription)
    : undefined;

  if (!app && invoice.customer) {
    app = apps.find((a) => a.stripe_customer_id === invoice.customer);
    if (app) console.warn(`[webhook] ${context}: match por customer (sub ${invoice.subscription ?? "—"} no encontrada en Airtable)`);
  }

  if (!app && invoice.customer_email) {
    const email = invoice.customer_email.toLowerCase().trim();
    app = apps.find((a) => (a.email ?? "").toLowerCase().trim() === email);
    if (app) console.warn(`[webhook] ${context}: match por email (sub/customer no encontrados)`);
  }

  if (!app) {
    console.error(
      `[webhook] ${context}: NO se encontró postulación`,
      { subscription: invoice.subscription, customer: invoice.customer, email: invoice.customer_email },
    );
    return null;
  }
  return app;
}

async function deactivatePortalForStartup(
  airtableId: string,
  email: string | undefined,
  firstName: string | undefined,
  startupRecordId: string | undefined,
) {
  // Obtener emails antes de desactivar (después de deactivate ya no tienen portal_access)
  const founderEmails = startupRecordId
    ? await getFounderEmailsByStartup(startupRecordId).catch(() => [] as string[])
    : [];

  await Promise.all([
    updateApplicationStatus(airtableId, "Churn", { portal_access: false }),
    deactivateAllFoundersForApplication(airtableId),
    startupRecordId ? updateStartupStatus(startupRecordId, "Churn") : Promise.resolve(),
  ]);

  // Remover founders de todos los eventos de Calendar (un solo barrido serial).
  if (founderEmails.length) {
    try {
      const eventIds = await getCalendarEventIds();
      await removeAttendeesFromAllEvents(eventIds, founderEmails);
    } catch (err) {
      console.error("Calendar remove error:", err instanceof Error ? err.message : err);
    }
  }

  if (email && firstName) await sendChurnEmail(email, firstName, airtableId);
}

// Espejo inverso de deactivatePortalForStartup: si un pago entra para una
// postulación que estaba FUERA del programa (Churn / Churn By Founder), la
// resucita a "Inscrita" con todos los accesos. Reutiliza activatePortalForStartup,
// que reactiva founders + startup + reinvita S1/S2 en calendar + onboarding.
//
// Idempotente: si el status ya otorga acceso, es no-op → los 3 eventos de Stripe
// (checkout.session.completed, invoice.payment_succeeded, subscription.updated→active)
// pueden dispararse juntos sin duplicar la activación.
//
// Allowlist estricta: SOLO resucita desde Churn/Churn By Founder. Nunca desde
// Rechazada, Money Back u otro estado de salida — un pago tardío sobre una baja
// definitiva no debe reingresar a nadie sin decisión humana.
//
// Devuelve true si reactivó (para que el caller sepa que ya activó el portal y no
// lo vuelva a hacer). false = no hizo falta (ya dentro, o no aplica).
async function reactivateFromChurnIfNeeded(
  app: PostulacionRecord,
  opts: { amount: number; cuota: number; stripeInvoiceId?: string; stripeSubscriptionId?: string; stripeCustomerId?: string },
): Promise<boolean> {
  if (statusOtorgaAcceso(app.status)) return false;
  if (app.status !== "Churn" && app.status !== "Churn By Founder") return false;

  console.warn(`[webhook] reactivación por pago: ${app.email} venía de ${app.status} → Inscrita`);

  const startupRecordId = (app.startup_record as string[] | undefined)?.[0];

  // Status "Inscrita" + limpiar sensores de cobranza para que un payment_failed_at
  // viejo no la re-suspenda en el próximo ciclo del cron.
  await updateApplicationStatus(app.id!, "Inscrita", {
    portal_access: true,
    payment_failed_at: null,
    payment_resolved_at: null,
    payment_reminder_1_at: null,
    payment_reminder_2_at: null,
    payment_reminder_3_at: null,
    churn_reason: `Reactivado por pago ${new Date().toISOString().slice(0, 10)}`,
  } as never);

  // activatePortalForStartup manda el correo "pago recibido" — acá es verdad (sí
  // pagó), a diferencia de reactivate_no_charge. Registra el pago y reinvita calendar.
  await activatePortalForStartup({
    airtableId: app.id!,
    email: app.email,
    firstName: app.first_name,
    stripeCustomerId: opts.stripeCustomerId,
    startupRecordId,
    amount: opts.amount,
    cuota: opts.cuota,
    stripeInvoiceId: opts.stripeInvoiceId,
    stripeSubscriptionId: opts.stripeSubscriptionId,
    startup_name: app.startup_name,
    cuotaParaCorreo: 1,
    totalCuotas: app.total_cuotas ?? 3,
  });

  return true;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = await constructWebhookEvent(body, sig);
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[webhook] event:", event.type);

  let apps;
  try {
    apps = await getAllApplications();
  } catch (err) {
    console.error("[webhook] getAllApplications failed:", err);
    return NextResponse.json({ error: "Airtable error" }, { status: 500 });
  }

  switch (event.type) {

    // ── Subscription checkout completed (cuota 1) OR one-time payment ──────────
    case "checkout.session.completed": {
      const session = event.data.object as {
        metadata?: Record<string, string>;
        subscription?: string;
        payment_intent?: string;
        customer?: string;
        amount_total?: number;
        mode?: string;
      };

      const airtableId = session.metadata?.airtableId;
      console.log("[webhook] checkout.session.completed airtableId:", airtableId, "metadata:", session.metadata);
      if (!airtableId) { console.error("[webhook] no airtableId in metadata"); break; }

      const app = apps.find((a) => a.id === airtableId);
      console.log("[webhook] app found:", !!app, "total apps:", apps.length);
      if (!app) { console.error("[webhook] app not found for id:", airtableId); break; }

      const startupRecordId = (app.startup_record as string[] | undefined)?.[0];
      const amount = (session.amount_total ?? 34900) / 100;
      const isOneTime = session.mode === "payment";

      // For subscriptions, cuota 1. For one-time, all 3 cuotas at once.
      const cuota = isOneTime ? 3 : 1;
      const paymentStatus = isOneTime ? "Cuota 3 pagada" : "Cuota 1 pagada";

      // Si el checkout viene de un founder que estaba en Churn (retomó pago desde
      // /admin/recuperar-pagos o billing portal), este flujo ya lo pone en Inscrita
      // y activa el portal más abajo. Solo falta limpiar los sensores de cobranza
      // viejos y dejar rastro de la reactivación.
      const veniaDeChurn = app.status === "Churn" || app.status === "Churn By Founder";
      if (veniaDeChurn) {
        console.warn(`[webhook] reactivación por checkout: ${app.email} venía de ${app.status} → Inscrita`);
      }

      await updateApplicationStatus(airtableId, "Inscrita", {
        stripe_subscription_id: session.subscription ?? undefined,
        stripe_customer_id: session.customer,
        payment_status: paymentStatus,
        portal_access: true,
        ...(veniaDeChurn
          ? {
              payment_failed_at: null,
              payment_resolved_at: null,
              payment_reminder_1_at: null,
              payment_reminder_2_at: null,
              payment_reminder_3_at: null,
              churn_reason: `Reactivado por pago ${new Date().toISOString().slice(0, 10)}`,
            }
          : {}),
      } as never);

      // Set cancel_at on the subscription so Stripe hard-stops after the configured cuotas
      // total_cuotas todavía no está seteado en este punto del flujo (se hace después por el script
      // de reconciliación o manualmente); para checkouts vía portal usamos 3 cuotas como base.
      if (!isOneTime && session.subscription) {
        const { stripe } = await import("@/lib/stripe");
        const cuotasParaCancelar = app.total_cuotas ?? 3;
        // Margen de 5 días por ciclo para que Stripe alcance a cobrar antes del cancel
        const diasParaCancelar = (cuotasParaCancelar - 1) * 30 + 5;
        await stripe.subscriptions.update(session.subscription, {
          cancel_at: Math.floor(Date.now() / 1000) + diasParaCancelar * 24 * 60 * 60,
        });
      }

      try {
        await activatePortalForStartup({
          airtableId,
          email: app.email,
          firstName: app.first_name,
          stripeCustomerId: session.customer as string,
          startupRecordId,
          amount,
          cuota,
          stripeInvoiceId: isOneTime ? session.payment_intent as string : undefined,
          stripeSubscriptionId: session.subscription,
          startup_name: app.startup_name,
          // Pago completo → correo de primer pago (pago_cuota_1) y nada más.
          // Pago en cuotas → correo de cuota 1 igual (es la primera).
          cuotaParaCorreo: 1,
          // Pago único → 1 cuota total. En cuotas usa total_cuotas (o 3 default).
          totalCuotas: isOneTime ? 1 : (app.total_cuotas ?? 3),
        });
        console.log("[webhook] activatePortalForStartup OK");
      } catch (err) {
        console.error("[webhook] activatePortalForStartup failed:", err);
        throw err;
      }

      break;
    }

    // ── Subscription invoice paid (cuota 2 y 3) ────────────────────────────────
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as {
        subscription?: string;
        customer?: string;
        customer_email?: string;
        billing_reason?: string;
        amount_paid?: number;
        id?: string;
      };
      // Skip the first charge (handled by checkout.session.completed)
      if (invoice.billing_reason === "subscription_create") break;

      const app = matchAppForInvoice(apps, invoice, "invoice.payment_succeeded");
      if (!app) break;

      // Si venía de Churn, este pago lo reingresa: reactiva todos los accesos y
      // registra el pago (vía activatePortalForStartup). Corta acá para no duplicar.
      const reactivado = await reactivateFromChurnIfNeeded(app, {
        amount: (invoice.amount_paid ?? 34900) / 100,
        cuota: 1,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: invoice.subscription,
        stripeCustomerId: invoice.customer,
      });
      if (reactivado) break;

      const totalCuotas = app.total_cuotas ?? 3;
      const prevMatch = (app.payment_status ?? "").match(/Cuota (\d+) pagada/);
      const prevInstallment = prevMatch ? parseInt(prevMatch[1], 10) : 0;
      const currentInstallment = prevInstallment + 1;
      await updateApplicationStatus(app.id!, app.status!, {
        payment_status: `Cuota ${currentInstallment} pagada` as PaymentStatus,
        // Si venía de un fallo previo, marcar como resuelto
        ...(app.payment_failed_at && !app.payment_resolved_at
          ? { payment_resolved_at: new Date().toISOString() }
          : {}),
      });

      const startupRecordId = (app.startup_record as string[] | undefined)?.[0];
      if (startupRecordId) {
        await createPagoRecord({
          postulacionId: app.id!,
          startupRecordId,
          email: app.email ?? "",
          startup_name: app.startup_name ?? "",
          cuota: currentInstallment,
          amount: (invoice.amount_paid ?? 34900) / 100,
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: invoice.subscription,
        });
      }
      if (app.email && app.first_name) {
        await sendPaymentConfirmation(app.email, app.first_name, currentInstallment, totalCuotas);
      }

      // Al llegar a la última cuota, cancelar la suscripción automáticamente
      if (currentInstallment >= totalCuotas && invoice.subscription) {
        const { stripe } = await import("@/lib/stripe");
        await stripe.subscriptions.cancel(invoice.subscription, { prorate: false });
      }
      break;
    }

    // ── Subscription payment failed ────────────────────────────────────────────
    case "invoice.payment_failed": {
      const invoice = event.data.object as {
        subscription?: string;
        customer?: string;
        customer_email?: string;
        attempt_count?: number;
      };
      const app = matchAppForInvoice(apps, invoice, "invoice.payment_failed");
      if (!app) break;

      const attempt = invoice.attempt_count ?? 1;

      // Marcar payment_failed_at la primera vez para que el cron de cobranza lo detecte
      if (attempt === 1 && !app.payment_failed_at) {
        await updateApplicationStatus(app.id!, app.status!, {
          payment_failed_at: new Date().toISOString(),
        });
      }

      if (attempt >= 4) {
        const startupRecordId = (app.startup_record as string[] | undefined)?.[0];
        await deactivatePortalForStartup(app.id!, app.email, app.first_name, startupRecordId);
        if (app.email && app.first_name) {
          await sendPortalDeactivatedEmail(app.email, app.first_name);
        }
      } else {
        if (app.email && app.first_name) {
          await sendPaymentFailedEmail(
            app.email, app.first_name, attempt,
            `${process.env.NEXT_PUBLIC_APP_URL}/portal`
          );
        }
      }
      break;
    }

    // ── Subscription en problema (red de seguridad de cobranza) ────────────────
    // invoice.payment_failed es el canal primario (trae attempt_count y manda los
    // correos). Este evento es respaldo: si la sub cae a past_due/unpaid y por lo
    // que sea no se estampó payment_failed_at, lo marca aquí para que el founder
    // entre al flujo de cobranza (cron + portal). NO manda correo → evita duplicar
    // el que ya envía invoice.payment_failed.
    case "customer.subscription.updated": {
      const sub = event.data.object as { id: string; status: string; customer?: string };

      let app = apps.find((a) => a.stripe_subscription_id === sub.id);
      if (!app && sub.customer) app = apps.find((a) => a.stripe_customer_id === sub.customer);

      // Reintento de Stripe exitoso: la sub vuelve a "active". Si el founder estaba
      // en Churn (la sub cayó a unpaid y luego se recuperó), reingresarlo con todos
      // los accesos. Idempotente: no-op si ya está dentro.
      if (sub.status === "active") {
        if (app) {
          await reactivateFromChurnIfNeeded(app, {
            amount: 34900 / 100,
            cuota: 1,
            stripeSubscriptionId: sub.id,
            stripeCustomerId: sub.customer,
          });
        }
        break;
      }

      if (sub.status !== "past_due" && sub.status !== "unpaid") break;

      if (!app) {
        console.error("[webhook] subscription.updated past_due: NO se encontró postulación", { sub: sub.id, customer: sub.customer });
        break;
      }

      if (!app.payment_failed_at) {
        console.warn(`[webhook] subscription.updated: sub ${sub.id} → ${sub.status}, estampando payment_failed_at (red de seguridad)`);
        await updateApplicationStatus(app.id!, app.status!, {
          payment_failed_at: new Date().toISOString(),
        });
      }
      break;
    }

    // ── Subscription cancelled ─────────────────────────────────────────────────
    case "customer.subscription.deleted": {
      const sub = event.data.object as {
        id: string;
        cancellation_details?: { reason?: string | null } | null;
      };
      const app = apps.find((a) => a.stripe_subscription_id === sub.id);
      if (!app) break;

      // El mismo evento se dispara en dos situaciones muy distintas:
      //   (a) FIN NATURAL: el founder terminó de pagar sus cuotas, Stripe cierra la
      //       sub sola (no hay más que cobrar). reason === null. NO es churn — debe
      //       CONSERVAR el acceso al programa.
      //   (b) CANCELACIÓN REAL: alguien la canceló a mano en Stripe, o cayó por
      //       falla de pago / disputa. reason ∈ {cancellation_requested,
      //       payment_failed, payment_disputed, canceled_by_retention_policy}.
      //       SÍ es churn → apagar portal_access + sacar del calendario.
      //
      // Antes se usaba la heurística `payment_status !== "Cuota 3 pagada"`, que
      // dejaba con acceso fantasma a quien ya había pagado completo y luego se le
      // cancelaba la sub a mano (OP-1939). La señal cancellation_details.reason de
      // Stripe distingue ambos casos sin ambigüedad.
      const reason = sub.cancellation_details?.reason ?? null;
      const esCancelacionReal = reason !== null;

      // Guarda: si el propio founder ya se dio de baja por el portal
      // (Churn By Founder), ese flujo ya limpió todo — no re-procesar.
      if (esCancelacionReal && app.status !== "Churn By Founder") {
        const startupRecordId = (app.startup_record as string[] | undefined)?.[0];
        await deactivatePortalForStartup(app.id!, app.email, app.first_name, startupRecordId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

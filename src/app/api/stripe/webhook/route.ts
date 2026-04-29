import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import {
  getAllApplications,
  updateApplicationStatus,
  updateStartupStatus,
  createPagoRecord,
  activateAllFoundersForApplication,
  deactivateAllFoundersForApplication,
} from "@/lib/airtable";
import {
  sendOnboardingEmail,
  sendPaymentConfirmation,
  sendPaymentFailedEmail,
  sendChurnEmail,
} from "@/lib/resend";

// Activates portal for the main founder + any team members linked to the startup
async function activatePortalForStartup(
  airtableId: string,
  email: string | undefined,
  firstName: string | undefined,
  stripeCustomerId: string | undefined,
  startupRecordId: string | undefined,
  amount: number,
  cuota: number,
  stripeInvoiceId?: string,
  stripeSubscriptionId?: string,
  startup_name?: string,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Activate all founders (main + team members) linked to this postulacion
  await activateAllFoundersForApplication(airtableId, stripeCustomerId);

  // Update startup status
  if (startupRecordId) await updateStartupStatus(startupRecordId, "Inscrita");

  // Register payment record
  if (startupRecordId && email) {
    await createPagoRecord({
      postulacionId: airtableId,
      startupRecordId,
      email,
      startup_name: startup_name ?? "",
      cuota,
      amount,
      stripe_invoice_id: stripeInvoiceId,
      stripe_subscription_id: stripeSubscriptionId,
    });
  }

  // Send onboarding + confirmation emails
  if (email && firstName) {
    await sendOnboardingEmail(email, firstName, `${appUrl}/portal`);
    await sendPaymentConfirmation(email, firstName, cuota);
  }
}

async function deactivatePortalForStartup(
  airtableId: string,
  email: string | undefined,
  firstName: string | undefined,
  startupRecordId: string | undefined,
) {
  await Promise.all([
    updateApplicationStatus(airtableId, "Churn", { portal_access: false }),
    deactivateAllFoundersForApplication(airtableId),
    startupRecordId ? updateStartupStatus(startupRecordId, "Churn") : Promise.resolve(),
  ]);
  if (email && firstName) await sendChurnEmail(email, firstName);
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

      await updateApplicationStatus(airtableId, "Inscrita", {
        stripe_subscription_id: session.subscription ?? undefined,
        stripe_customer_id: session.customer,
        payment_status: paymentStatus,
        portal_access: true,
      });

      // Set cancel_at on the subscription so Stripe hard-stops after 3 cycles
      if (!isOneTime && session.subscription) {
        const { stripe } = await import("@/lib/stripe");
        await stripe.subscriptions.update(session.subscription, {
          cancel_at: Math.floor(Date.now() / 1000) + 95 * 24 * 60 * 60,
        });
      }

      try {
        await activatePortalForStartup(
          airtableId,
          app.email,
          app.first_name,
          session.customer as string,
          startupRecordId,
          amount,
          cuota,
          isOneTime ? session.payment_intent as string : undefined,
          session.subscription,
          app.startup_name,
        );
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
        billing_reason?: string;
        amount_paid?: number;
        id?: string;
      };
      // Skip the first charge (handled by checkout.session.completed)
      if (invoice.billing_reason === "subscription_create") break;

      const app = apps.find((a) => a.stripe_subscription_id === invoice.subscription);
      if (!app) break;

      const currentInstallment = app.payment_status === "Cuota 1 pagada" ? 2 : 3;
      await updateApplicationStatus(app.id!, app.status!, {
        payment_status: `Cuota ${currentInstallment} pagada` as const,
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
        await sendPaymentConfirmation(app.email, app.first_name, currentInstallment);
      }

      // After cuota 3, cancel the subscription automatically
      if (currentInstallment === 3 && invoice.subscription) {
        const { stripe } = await import("@/lib/stripe");
        await stripe.subscriptions.cancel(invoice.subscription, { prorate: false });
      }
      break;
    }

    // ── Subscription payment failed ────────────────────────────────────────────
    case "invoice.payment_failed": {
      const invoice = event.data.object as { subscription?: string; attempt_count?: number };
      const app = apps.find((a) => a.stripe_subscription_id === invoice.subscription);
      if (!app) break;

      const attempt = invoice.attempt_count ?? 1;
      if (attempt >= 4) {
        const startupRecordId = (app.startup_record as string[] | undefined)?.[0];
        await deactivatePortalForStartup(app.id!, app.email, app.first_name, startupRecordId);
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

    // ── Subscription cancelled ─────────────────────────────────────────────────
    case "customer.subscription.deleted": {
      const sub = event.data.object as { id: string };
      const app = apps.find((a) => a.stripe_subscription_id === sub.id);
      if (!app) break;
      // Only churn if they haven't finished paying (auto-cancel after cuota 3 is OK)
      if (app.payment_status !== "Cuota 3 pagada") {
        const startupRecordId = (app.startup_record as string[] | undefined)?.[0];
        await deactivatePortalForStartup(app.id!, app.email, app.first_name, startupRecordId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getAllApplications, updateApplicationStatus, getFounderEmailsByStartup, getCalendarEventIds, type ApplicationStatus } from "@/lib/airtable";
import { sendAdmissionEmail, sendRejectionEmail, sendCouponLink, sendPaymentConfirmation } from "@/lib/email-engine";
import { createCheckoutToken } from "@/lib/checkout-token";
import { addAttendeesToAllEvents, removeAttendeeFromAllEvents } from "@/lib/calendar";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

async function inviteStartupToCalendar(startupId: string) {
  try {
    const [emails, eventIds] = await Promise.all([
      getFounderEmailsByStartup(startupId),
      getCalendarEventIds(),
    ]);
    if (emails.length && eventIds.length) {
      await addAttendeesToAllEvents(eventIds, emails);
    }
  } catch (err) {
    console.error("Calendar invite error (non-blocking):", err instanceof Error ? err.message : err);
  }
}

async function buildCheckoutUrl(recordId: string, app: {
  email?: string; first_name?: string; startup_name?: string;
  stripe_coupon_id?: unknown; stripe_promotion_code_id?: unknown; discount_percent?: unknown;
}) {
  const rawId = (app.stripe_promotion_code_id || app.stripe_coupon_id) as string | undefined;
  // Stripe coupon IDs start with "coup_"; everything else is treated as a promotion code ID
  const isCoupon = rawId?.startsWith("coup_");
  const token = await createCheckoutToken({
    airtableId: recordId,
    email: app.email!,
    firstName: app.first_name!,
    startupName: app.startup_name!,
    stripeCouponId: isCoupon ? rawId : undefined,
    stripePromotionCodeId: isCoupon ? undefined : rawId,
    discountPercent: app.discount_percent ? Number(app.discount_percent) : undefined,
  });
  return `${APP_URL}/checkout/${token}`;
}

export async function GET(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const apps = await getAllApplications();
  return NextResponse.json(apps);
}

export async function PATCH(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const body = await req.json();
  const { recordId, status, rejection_reason, coupon_code, discount_percent, stripe_coupon_id, stripe_promotion_code_id } = body;
  if (!recordId) return NextResponse.json({ error: "Falta recordId" }, { status: 400 });

  // ── Reenviar checkout ────────────────────────────────────────────────────────
  if (body.action === "resend_checkout") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (!app) return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });
      const checkoutUrl = await buildCheckoutUrl(recordId, app);
      const discountPct = app.discount_percent ? Number(app.discount_percent) : 0;
      console.log(`[resend_checkout] recordId=${recordId} email=${app.email} discount=${discountPct}%`);
      if (discountPct > 0) {
        await sendCouponLink(app.email!, app.first_name!, checkoutUrl, discountPct);
      } else {
        await sendAdmissionEmail(app.email!, app.first_name!, checkoutUrl);
      }
      return NextResponse.json({ success: true, url: checkoutUrl });
    } catch (err) {
      console.error(`[resend_checkout] error recordId=${recordId}`, err);
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  }

  // ── Asignar cupón ────────────────────────────────────────────────────────────
  if (!status && coupon_code !== undefined) {
    try {
      const { assignCouponToApplication } = await import("@/lib/airtable");
      await assignCouponToApplication(recordId, coupon_code, discount_percent ?? 0, stripe_coupon_id ?? "", stripe_promotion_code_id ?? "");

      // Si ya está admitida, regenerar y reenviar checkout con el nuevo cupón (non-blocking)
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (app && app.status === "Admitida") {
        try {
          const appWithCoupon = {
            ...app,
            stripe_coupon_id: stripe_coupon_id ?? "",
            stripe_promotion_code_id: stripe_promotion_code_id ?? "",
            discount_percent: discount_percent ?? 0,
          };
          const checkoutUrl = await buildCheckoutUrl(recordId, appWithCoupon);
          const discountPct = Number(discount_percent ?? 0);
          console.log(`[coupon_assign] recordId=${recordId} email=${app.email} discount=${discountPct}% url=${checkoutUrl}`);
          if (discountPct > 0) {
            await sendCouponLink(app.email!, app.first_name!, checkoutUrl, discountPct);
          } else {
            await sendAdmissionEmail(app.email!, app.first_name!, checkoutUrl);
          }
        } catch (err) {
          console.error(`[coupon_assign] email error recordId=${recordId}`, err);
        }
      }

      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  }

  if (!status) return NextResponse.json({ error: "Falta status" }, { status: 400 });

  // ── Cambio de status ─────────────────────────────────────────────────────────
  const extra: Record<string, unknown> = {};
  if (rejection_reason) extra.rejection_reason = rejection_reason;

  if (status === "Admitida") extra.admitted_at = new Date().toISOString();
  await updateApplicationStatus(recordId, status as ApplicationStatus, extra);

  if (status === "Admitida") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (app) {
        const discountPct = app.discount_percent ? Number(app.discount_percent) : 0;
        console.log(`[admit] recordId=${recordId} email=${app.email} discount=${discountPct}%`);
        if (discountPct === 100) {
          await updateApplicationStatus(recordId, "Inscrita", { portal_access: true });
          const startupId = (app.startup_record as string[] | undefined)?.[0];
          if (startupId) await inviteStartupToCalendar(startupId);
          // Beca 100%: no pasa por el webhook de Stripe (no hay cobro), así que el
          // correo de inscripción confirmada se dispara acá manualmente.
          if (app.email && app.first_name) {
            await sendPaymentConfirmation(app.email, app.first_name, 1);
          }
          return NextResponse.json({ success: true, inscrita_directa: true });
        }
        const checkoutUrl = await buildCheckoutUrl(recordId, app);
        console.log(`[admit] checkoutUrl=${checkoutUrl}`);
        if (discountPct > 0) {
          await sendCouponLink(app.email!, app.first_name!, checkoutUrl, discountPct);
        } else {
          await sendAdmissionEmail(app.email!, app.first_name!, checkoutUrl);
        }
      } else {
        console.error(`[admit] app not found for recordId=${recordId}`);
      }
    } catch (err) {
      console.error(`[admit] email error recordId=${recordId}`, err);
    }
  }

  if (status === "Rechazada") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      if (app) {
        console.log(`[reject] recordId=${recordId} email=${app.email}`);
        await sendRejectionEmail(app.email!, app.first_name!);
      }
    } catch (err) {
      console.error(`[reject] email error recordId=${recordId}`, err);
    }
  }

  if (status === "Churn" || status === "Churn By Founder") {
    try {
      const apps = await getAllApplications();
      const app = apps.find((a) => a.id === recordId);
      const startupId = (app?.startup_record as string[] | undefined)?.[0];
      if (startupId) {
        const [founderEmails, eventIds] = await Promise.all([
          getFounderEmailsByStartup(startupId),
          getCalendarEventIds(),
        ]);
        if (founderEmails.length && eventIds.length) {
          await Promise.allSettled(
            founderEmails.map((email) => removeAttendeeFromAllEvents(eventIds, email))
          );
        }
      }
    } catch (err) {
      console.error("Calendar remove error:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ success: true });
}

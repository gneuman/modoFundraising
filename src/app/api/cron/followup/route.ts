export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAllApplications, updateApplicationStatus } from "@/lib/airtable";
import { sendAdmissionFollowUp } from "@/lib/resend";
import { createCheckoutToken } from "@/lib/checkout-token";

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

// Días de espera entre cada paso
const DAYS_UNTIL_FOLLOWUP_1 = 2;
const DAYS_UNTIL_FOLLOWUP_2 = 2; // 2 días después del follow-up 1
const DAYS_UNTIL_CLOSE = 2;      // 2 días después del follow-up 2 → se cierra

function daysSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

/**
 * POST /api/cron/followup
 * Llamar desde n8n cada día con:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Lógica por postulación "Admitida" sin pago:
 *   - Sin follow_up_1: si pasaron ≥2 días desde admitted_at → envía follow-up 1
 *   - Con follow_up_1, sin follow_up_2: si pasaron ≥2 días desde follow_up_1_sent_at → envía follow-up 2
 *   - Con follow_up_2: si pasaron ≥2 días desde follow_up_2_sent_at → cierra (status "Sin Respuesta")
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await getAllApplications();

  const pendientes = apps.filter(
    (a) =>
      a.status === "Admitida" &&
      (!a.payment_status || a.payment_status === "Pendiente")
  );

  const results: { id: string; email: string; action: string }[] = [];
  const errors: { id: string; email: string; error: string }[] = [];

  for (const app of pendientes) {
    try {
      // Determinar acción según estado de follow-ups y fechas
      if (app.follow_up_2_sent && app.follow_up_2_sent_at) {
        // Ya mandamos los 2 follow-ups → cerrar si pasaron los días
        if (daysSince(app.follow_up_2_sent_at) >= DAYS_UNTIL_CLOSE) {
          await updateApplicationStatus(app.id!, "Sin Respuesta", { portal_access: false });
          results.push({ id: app.id!, email: app.email!, action: "closed" });
        }
        continue;
      }

      if (app.follow_up_1_sent && app.follow_up_1_sent_at && !app.follow_up_2_sent) {
        // Follow-up 1 ya enviado → mandar follow-up 2 si pasaron los días
        if (daysSince(app.follow_up_1_sent_at) >= DAYS_UNTIL_FOLLOWUP_2) {
          const token = await createCheckoutToken({
            airtableId: app.id!,
            email: app.email!,
            firstName: app.first_name!,
            startupName: app.startup_name!,
            stripeCouponId: app.stripe_coupon_id as string | undefined,
            discountPercent: app.discount_percent ? Number(app.discount_percent) : undefined,
          });
          const checkoutUrl = `${APP_URL}/checkout/${token}`;
          await sendAdmissionFollowUp(app.email!, app.first_name!, checkoutUrl, 2);
          await updateApplicationStatus(app.id!, "Admitida", {
            follow_up_2_sent: true,
            follow_up_2_sent_at: new Date().toISOString(),
          });
          results.push({ id: app.id!, email: app.email!, action: "followup_2_sent" });
        }
        continue;
      }

      if (!app.follow_up_1_sent && app.admitted_at) {
        // Primer follow-up pendiente → mandar si pasaron los días
        if (daysSince(app.admitted_at) >= DAYS_UNTIL_FOLLOWUP_1) {
          const token = await createCheckoutToken({
            airtableId: app.id!,
            email: app.email!,
            firstName: app.first_name!,
            startupName: app.startup_name!,
            stripeCouponId: app.stripe_coupon_id as string | undefined,
            discountPercent: app.discount_percent ? Number(app.discount_percent) : undefined,
          });
          const checkoutUrl = `${APP_URL}/checkout/${token}`;
          await sendAdmissionFollowUp(app.email!, app.first_name!, checkoutUrl, 1);
          await updateApplicationStatus(app.id!, "Admitida", {
            follow_up_1_sent: true,
            follow_up_1_sent_at: new Date().toISOString(),
          });
          results.push({ id: app.id!, email: app.email!, action: "followup_1_sent" });
        }
        continue;
      }
    } catch (err) {
      errors.push({
        id: app.id!,
        email: app.email!,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    processed: pendientes.length,
    actions: results,
    errors,
  });
}

/**
 * GET /api/cron/followup
 * Preview: muestra qué haría el cron si corriera ahora, sin enviar nada.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await getAllApplications();

  const pendientes = apps.filter(
    (a) =>
      a.status === "Admitida" &&
      (!a.payment_status || a.payment_status === "Pendiente")
  );

  const preview = pendientes.map((a) => {
    let pendingAction = "waiting";
    let daysElapsed: number | null = null;

    if (a.follow_up_2_sent && a.follow_up_2_sent_at) {
      daysElapsed = Math.round(daysSince(a.follow_up_2_sent_at) * 10) / 10;
      pendingAction = daysElapsed >= DAYS_UNTIL_CLOSE ? "will_close" : `close_in_${(DAYS_UNTIL_CLOSE - daysElapsed).toFixed(1)}d`;
    } else if (a.follow_up_1_sent && a.follow_up_1_sent_at) {
      daysElapsed = Math.round(daysSince(a.follow_up_1_sent_at) * 10) / 10;
      pendingAction = daysElapsed >= DAYS_UNTIL_FOLLOWUP_2 ? "will_send_followup_2" : `followup_2_in_${(DAYS_UNTIL_FOLLOWUP_2 - daysElapsed).toFixed(1)}d`;
    } else if (!a.follow_up_1_sent && a.admitted_at) {
      daysElapsed = Math.round(daysSince(a.admitted_at) * 10) / 10;
      pendingAction = daysElapsed >= DAYS_UNTIL_FOLLOWUP_1 ? "will_send_followup_1" : `followup_1_in_${(DAYS_UNTIL_FOLLOWUP_1 - daysElapsed).toFixed(1)}d`;
    } else if (!a.admitted_at) {
      pendingAction = "no_admitted_at_date";
    }

    return {
      id: a.id,
      startup_name: a.startup_name,
      email: a.email,
      admitted_at: a.admitted_at,
      follow_up_1_sent: a.follow_up_1_sent,
      follow_up_1_sent_at: a.follow_up_1_sent_at,
      follow_up_2_sent: a.follow_up_2_sent,
      follow_up_2_sent_at: a.follow_up_2_sent_at,
      days_elapsed: daysElapsed,
      pending_action: pendingAction,
    };
  });

  return NextResponse.json({ count: pendientes.length, preview });
}

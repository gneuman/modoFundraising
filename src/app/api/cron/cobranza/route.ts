export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAllApplications, updateApplicationStatus } from "@/lib/airtable";
import { sendPaymentFailedEmail, sendPortalDeactivatedEmail } from "@/lib/email-engine";
import { deactivateAllFoundersForApplication } from "@/lib/airtable";
import { getSubscription } from "@/lib/stripe";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

// Días entre intentos de cobranza
const DAYS_REMINDER_1 = 2;  // 2 días después del primer fallo
const DAYS_REMINDER_2 = 3;  // 3 días después del segundo aviso
const DAYS_SUSPEND    = 3;  // 3 días después del tercer aviso → suspender

function daysSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

/**
 * POST /api/cron/cobranza
 * Llamar desde n8n cada día con:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Lógica: busca inscritas con payment_failed_at en Airtable y
 * les manda recordatorios escalonados. Si Stripe ya reintentó y
 * desactivó, este cron actúa como red de seguridad.
 *
 * Campos en Airtable que necesita:
 *   payment_failed_at     (fecha del primer fallo)
 *   payment_reminder_1_at (fecha del primer recordatorio enviado)
 *   payment_reminder_2_at (fecha del segundo recordatorio enviado)
 *   payment_reminder_3_at (fecha del tercer recordatorio enviado)
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await getAllApplications();

  // Inscritas con pago fallido pendiente de resolver
  const conFallo = apps.filter(
    (a) =>
      a.status === "Inscrita" &&
      a.payment_failed_at &&
      !a.payment_resolved_at
  );

  const results: { id: string; email: string; action: string }[] = [];
  const errors:  { id: string; email: string; error: string }[]  = [];

  for (const app of conFallo) {
    try {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

      // Verificar si Stripe ya cobró (suscripción activa = problema resuelto)
      if (app.stripe_subscription_id) {
        try {
          const sub = await getSubscription(app.stripe_subscription_id as string);
          if (sub.status === "active") {
            await updateApplicationStatus(app.id!, "Inscrita", { payment_resolved_at: new Date().toISOString() });
            results.push({ id: app.id!, email: app.email!, action: "auto_resolved" });
            continue;
          }
        } catch {
          // Si no se puede obtener la suscripción, seguir con el flujo normal
        }
      }

      // Suspender si ya pasaron los días tras el 3er aviso
      if (app.payment_reminder_3_at && daysSince(app.payment_reminder_3_at) >= DAYS_SUSPEND) {
        await updateApplicationStatus(app.id!, "Churn", { portal_access: false });
        await deactivateAllFoundersForApplication(app.id!);
        if (app.email && app.first_name) {
          await sendPortalDeactivatedEmail(app.email, app.first_name);
        }
        results.push({ id: app.id!, email: app.email!, action: "suspended" });
        continue;
      }

      // 3er aviso
      if (app.payment_reminder_2_at && !app.payment_reminder_3_at &&
          daysSince(app.payment_reminder_2_at) >= DAYS_REMINDER_2) {
        if (app.email && app.first_name) {
          await sendPaymentFailedEmail(app.email, app.first_name, 3, `${appUrl}/portal`);
        }
        await updateApplicationStatus(app.id!, "Inscrita", {
          payment_reminder_3_at: new Date().toISOString(),
        });
        results.push({ id: app.id!, email: app.email!, action: "reminder_3_sent" });
        continue;
      }

      // 2do aviso
      if (app.payment_reminder_1_at && !app.payment_reminder_2_at &&
          daysSince(app.payment_reminder_1_at) >= DAYS_REMINDER_1) {
        if (app.email && app.first_name) {
          await sendPaymentFailedEmail(app.email, app.first_name, 2, `${appUrl}/portal`);
        }
        await updateApplicationStatus(app.id!, "Inscrita", {
          payment_reminder_2_at: new Date().toISOString(),
        });
        results.push({ id: app.id!, email: app.email!, action: "reminder_2_sent" });
        continue;
      }

      // 1er aviso (inmediato al detectar el fallo)
      if (!app.payment_reminder_1_at) {
        if (app.email && app.first_name) {
          await sendPaymentFailedEmail(app.email, app.first_name, 1, `${appUrl}/portal`);
        }
        await updateApplicationStatus(app.id!, "Inscrita", {
          payment_reminder_1_at: new Date().toISOString(),
        });
        results.push({ id: app.id!, email: app.email!, action: "reminder_1_sent" });
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

  return NextResponse.json({ processed: conFallo.length, actions: results, errors });
}

/**
 * GET /api/cron/cobranza
 * Preview sin enviar nada.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await getAllApplications();
  const conFallo = apps.filter(
    (a) => a.status === "Inscrita" && a.payment_failed_at && !a.payment_resolved_at
  );

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  const preview = conFallo.map((a) => {
    let pendingAction = "waiting";

    if (a.payment_reminder_3_at) {
      const d = daysSince(a.payment_reminder_3_at);
      pendingAction = d >= DAYS_SUSPEND ? "will_suspend" : `suspend_in_${(DAYS_SUSPEND - d).toFixed(1)}d`;
    } else if (a.payment_reminder_2_at) {
      const d = daysSince(a.payment_reminder_2_at);
      pendingAction = d >= DAYS_REMINDER_2 ? "will_send_reminder_3" : `reminder_3_in_${(DAYS_REMINDER_2 - d).toFixed(1)}d`;
    } else if (a.payment_reminder_1_at) {
      const d = daysSince(a.payment_reminder_1_at);
      pendingAction = d >= DAYS_REMINDER_1 ? "will_send_reminder_2" : `reminder_2_in_${(DAYS_REMINDER_1 - d).toFixed(1)}d`;
    } else {
      pendingAction = "will_send_reminder_1";
    }

    return {
      id: a.id,
      startup_name: a.startup_name,
      email: a.email,
      payment_failed_at: a.payment_failed_at,
      payment_reminder_1_at: a.payment_reminder_1_at,
      payment_reminder_2_at: a.payment_reminder_2_at,
      payment_reminder_3_at: a.payment_reminder_3_at,
      portal_url: `${appUrl}/portal`,
      pending_action: pendingAction,
    };
  });

  return NextResponse.json({ count: conFallo.length, preview });
}

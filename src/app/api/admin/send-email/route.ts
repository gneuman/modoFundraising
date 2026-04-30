import { NextRequest, NextResponse } from "next/server";
import { getAllApplications } from "@/lib/airtable";
import { createCheckoutToken } from "@/lib/checkout-token";
import {
  sendAdmissionEmail,
  sendAdmissionFollowUp,
  sendRejectionEmail,
  sendCouponLink,
  sendOnboardingEmail,
  sendPaymentConfirmation,
  sendChurnEmail,
} from "@/lib/gmail";

// Auth: Bearer token usando EMAIL_API_SECRET o JWT_SECRET como fallback
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.EMAIL_API_SECRET ?? process.env.JWT_SECRET ?? "";
  return auth === `Bearer ${secret}`;
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { recordId?: string; type?: string; installment?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { recordId, type, installment } = body;

  if (!recordId || !type) {
    return NextResponse.json(
      { error: "Falta recordId o type", validTypes: ["admision", "cupon", "rechazo", "follow_up_1", "follow_up_2", "onboarding", "pago_confirmado", "churn"] },
      { status: 400 }
    );
  }

  const apps = await getAllApplications();
  const app = apps.find((a) => a.id === recordId);
  if (!app) {
    return NextResponse.json({ error: `No se encontró postulación con id: ${recordId}` }, { status: 404 });
  }

  const email = app.email!;
  const firstName = app.first_name!;
  const discountPct = app.discount_percent ? Number(app.discount_percent) : 0;

  async function buildCheckoutUrl() {
    const token = await createCheckoutToken({
      airtableId: recordId!,
      email,
      firstName,
      startupName: app!.startup_name!,
      stripeCouponId: app!.stripe_coupon_id as string | undefined,
      discountPercent: discountPct || undefined,
    });
    return `${APP_URL}/checkout/${token}`;
  }

  try {
    switch (type) {
      case "admision": {
        const checkoutUrl = await buildCheckoutUrl();
        if (discountPct > 0) {
          await sendCouponLink(email, firstName, checkoutUrl, discountPct);
        } else {
          await sendAdmissionEmail(email, firstName, checkoutUrl);
        }
        return NextResponse.json({ sent: "admision", to: email, checkoutUrl });
      }

      case "cupon": {
        if (!discountPct) {
          return NextResponse.json({ error: "La postulación no tiene descuento asignado" }, { status: 400 });
        }
        const checkoutUrl = await buildCheckoutUrl();
        await sendCouponLink(email, firstName, checkoutUrl, discountPct);
        return NextResponse.json({ sent: "cupon", to: email, discountPct, checkoutUrl });
      }

      case "rechazo": {
        await sendRejectionEmail(email, firstName);
        return NextResponse.json({ sent: "rechazo", to: email });
      }

      case "follow_up_1": {
        const checkoutUrl = await buildCheckoutUrl();
        await sendAdmissionFollowUp(email, firstName, checkoutUrl, 1);
        return NextResponse.json({ sent: "follow_up_1", to: email });
      }

      case "follow_up_2": {
        const checkoutUrl = await buildCheckoutUrl();
        await sendAdmissionFollowUp(email, firstName, checkoutUrl, 2);
        return NextResponse.json({ sent: "follow_up_2", to: email });
      }

      case "onboarding": {
        await sendOnboardingEmail(email, firstName, `${APP_URL}/portal`);
        return NextResponse.json({ sent: "onboarding", to: email });
      }

      case "pago_confirmado": {
        const cuota = installment ?? 1;
        if (cuota < 1 || cuota > 3) {
          return NextResponse.json({ error: "installment debe ser 1, 2 o 3" }, { status: 400 });
        }
        await sendPaymentConfirmation(email, firstName, cuota);
        return NextResponse.json({ sent: "pago_confirmado", to: email, installment: cuota });
      }

      case "churn": {
        await sendChurnEmail(email, firstName);
        return NextResponse.json({ sent: "churn", to: email });
      }

      default:
        return NextResponse.json(
          { error: `Tipo desconocido: ${type}`, validTypes: ["admision", "cupon", "rechazo", "follow_up_1", "follow_up_2", "onboarding", "pago_confirmado", "churn"] },
          { status: 400 }
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[send-email] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { getAllApplications, updateApplicationStatus } from "@/lib/airtable";
import { createStripeCustomer, createSubscriptionCheckout, createOneTimeCheckout, PROGRAM_PRICE_USD } from "@/lib/stripe";

// POST /api/stripe/portal-checkout
// Body: { mode: "subscription" | "payment" }
// Crea una sesión de checkout de Stripe para un founder logueado que aún no ha pagado
export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { mode = "subscription" } = await req.json().catch(() => ({}));

  const apps = await getAllApplications();
  const app = apps.find((a) => a.email === session.email);

  if (!app?.id) {
    return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  try {
    let customerId = app.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await createStripeCustomer(
        session.email,
        `${app.first_name ?? ""} ${app.last_name ?? ""} — ${app.startup_name ?? ""}`.trim()
      );
      customerId = customer.id;
      await updateApplicationStatus(app.id, app.status ?? "Admitida", { stripe_customer_id: customerId });
    }

    const successUrl = `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/portal/suscripcion`;
    const metadata = { airtableId: app.id, email: session.email, mode };

    let checkoutSession;

    const couponId = app.stripe_coupon_id as string | undefined;

    if (mode === "subscription") {
      checkoutSession = await createSubscriptionCheckout({
        customerId,
        priceId: process.env.STRIPE_PRICE_ID_MONTHLY!,
        couponId,
        successUrl,
        cancelUrl,
        metadata,
      });
    } else {
      checkoutSession = await createOneTimeCheckout({
        customerId,
        couponId,
        successUrl,
        cancelUrl,
        metadata,
      });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Portal checkout error:", err);
    return NextResponse.json({ error: "Error al crear sesión de pago" }, { status: 500 });
  }
}

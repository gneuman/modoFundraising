import { NextRequest, NextResponse } from "next/server";
import { verifyCheckoutToken } from "@/lib/checkout-token";
import {
  createStripeCustomer,
  createSubscriptionCheckout,
  createOneTimeCheckout,
} from "@/lib/stripe";
import { getAllApplications, updateApplicationStatus } from "@/lib/airtable";

// POST /api/checkout/session
// Body: { token, mode: "subscription" | "payment" }
export async function POST(req: NextRequest) {
  const { token, mode } = await req.json();

  const payload = await verifyCheckoutToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Link inválido o expirado" }, { status: 400 });
  }

  const { airtableId, email, firstName, startupName, stripeCouponId, discountPercent } = payload;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  try {
    // Reuse existing Stripe customer if already created
    const apps = await getAllApplications();
    const app = apps.find((a) => a.id === airtableId);
    let customerId = app?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await createStripeCustomer(email, `${firstName} — ${startupName}`);
      customerId = customer.id;
      await updateApplicationStatus(airtableId, "Admitida", { stripe_customer_id: customerId });
    }

    const successUrl = `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/checkout/${token}`;
    const metadata = { airtableId, email, mode };

    let session;

    if (mode === "subscription") {
      // 3 monthly payments of $349 (with coupon applied to each)
      session = await createSubscriptionCheckout({
        customerId,
        priceId: process.env.STRIPE_PRICE_ID_MONTHLY!,
        couponId: stripeCouponId,
        successUrl,
        cancelUrl,
        metadata,
      });
    } else {
      session = await createOneTimeCheckout({
        customerId,
        couponId: stripeCouponId,
        successUrl,
        cancelUrl,
        metadata,
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Checkout session error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

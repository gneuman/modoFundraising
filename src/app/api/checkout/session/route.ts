import { NextRequest, NextResponse } from "next/server";
import { verifyCheckoutToken } from "@/lib/checkout-token";
import {
  createStripeCustomer,
  createSubscriptionCheckout,
  createOneTimeCheckout,
  STRIPE_PRICE_ID_MONTHLY,
} from "@/lib/stripe";
import { getAllApplications, getAllCoupons, updateApplicationStatus } from "@/lib/airtable";

// POST /api/checkout/session
// Body: { token, mode: "subscription" | "payment" }
export async function POST(req: NextRequest) {
  const { token, mode } = await req.json();

  const payload = await verifyCheckoutToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Link inválido o expirado" }, { status: 400 });
  }

  const { airtableId, email, firstName, startupName, stripeCouponId: rawCouponId, stripePromotionCodeId: rawPromoId, discountPercent } = payload;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");

  try {
    // Reuse existing Stripe customer if already created
    const [apps, coupons] = await Promise.all([getAllApplications(), getAllCoupons()]);
    const app = apps.find((a) => a.id === airtableId);
    let customerId = app?.stripe_customer_id as string | undefined;

    // Resolve the correct Stripe IDs by looking up the coupon record
    // The stored ID may be either a coupon ID or a promotion code ID
    const storedId = rawPromoId || rawCouponId || (app?.stripe_coupon_id as string | undefined);
    const couponRecord = coupons.find(
      (c) => c.stripe_coupon_id === storedId || c.stripe_promotion_code_id === storedId
    );
    const stripeCouponId = couponRecord?.stripe_coupon_id;
    const stripePromotionCodeId = couponRecord?.stripe_promotion_code_id;

    console.log("[checkout] mode:", mode, "| storedId:", storedId ?? "none", "| resolved couponId:", stripeCouponId ?? "none", "| promoId:", stripePromotionCodeId ?? "none", "| discount:", discountPercent ?? 0);

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
        priceId: STRIPE_PRICE_ID_MONTHLY,
        couponId: stripeCouponId,
        promotionCodeId: stripePromotionCodeId,
        successUrl,
        cancelUrl,
        metadata,
      });
    } else {
      session = await createOneTimeCheckout({
        customerId,
        couponId: stripeCouponId,
        promotionCodeId: stripePromotionCodeId,
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

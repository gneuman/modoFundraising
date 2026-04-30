import { NextRequest, NextResponse } from "next/server";
import { createStripeCoupon, createStripePromoCode, STRIPE_PRICE_ID_MONTHLY, createSubscriptionCheckout, createStripeCustomer } from "@/lib/stripe";
import { createCouponRecord, getAllCoupons, getAllApplications } from "@/lib/airtable";
import { sendCouponLink } from "@/lib/gmail";

export async function GET(req: NextRequest) {

  const coupons = await getAllCoupons();
  return NextResponse.json(coupons);
}

export async function POST(req: NextRequest) {


  const { name, percentOff, code, description } = await req.json();
  if (!name || !percentOff || !code) {
    return NextResponse.json({ error: "Faltan campos: name, percentOff, code" }, { status: 400 });
  }

  const coupon = await createStripeCoupon({ name, percentOff, durationMonths: 3 });
  const promoCode = await createStripePromoCode(coupon.id, code);

  await createCouponRecord({
    code: code.toUpperCase(),
    discount_percent: percentOff,
    stripe_coupon_id: coupon.id,
    stripe_promotion_code_id: promoCode.id,
    description: description ?? "",
    active: true,
  });

  return NextResponse.json({ success: true, couponId: coupon.id, code: code.toUpperCase() });
}

export async function PUT(req: NextRequest) {


  const { email, firstName, couponId, percentOff } = await req.json();
  if (!email || !firstName || !couponId) {
    return NextResponse.json({ error: "Faltan campos: email, firstName, couponId" }, { status: 400 });
  }

  const apps = await getAllApplications();
  const app = apps.find((a) => a.email === email);
  let customerId = app?.stripe_customer_id;

  if (!customerId) {
    const customer = await createStripeCustomer(email, firstName);
    customerId = customer.id;
  }

  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const checkoutSession = await createSubscriptionCheckout({
    customerId,
    priceId: STRIPE_PRICE_ID_MONTHLY,
    couponId,
    successUrl: `${APP_URL}/portal?payment=success`,
    cancelUrl: `${APP_URL}/apply/success`,
    metadata: { email, airtableId: app?.id ?? "" },
  });

  await sendCouponLink(email, firstName, checkoutSession.url!, percentOff ?? 0);

  return NextResponse.json({ success: true, url: checkoutSession.url });
}

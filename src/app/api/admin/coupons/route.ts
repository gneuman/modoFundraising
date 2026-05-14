export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { createStripeCoupon, createStripePromoCode, STRIPE_PRICE_ID_MONTHLY, createSubscriptionCheckout, createStripeCustomer } from "@/lib/stripe";
import { createCouponRecord, getAllCoupons, getAllApplications, assignCouponToApplication } from "@/lib/airtable";
import { sendCouponLink } from "@/lib/email-engine";

export async function GET(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const coupons = await getAllCoupons();
  return NextResponse.json(coupons);
}

export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
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
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const { email, firstName, couponId, percentOff } = await req.json();
  if (!email || !firstName || !couponId) {
    return NextResponse.json({ error: "Faltan campos: email, firstName, couponId" }, { status: 400 });
  }

  const [apps, coupons] = await Promise.all([getAllApplications(), getAllCoupons()]);
  const app = apps.find((a) => a.email === email);
  let customerId = app?.stripe_customer_id;

  if (!customerId) {
    const customer = await createStripeCustomer(email, firstName);
    customerId = customer.id;
  }

  // Lookup full coupon record to get promotion code ID and discount %
  const couponRecord = coupons.find((c) => c.stripe_coupon_id === couponId);
  const promotionCodeId = couponRecord?.stripe_promotion_code_id;
  const discountPct = percentOff ?? couponRecord?.discount_percent ?? 0;
  const couponCode = couponRecord?.code ?? "";

  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const checkoutSession = await createSubscriptionCheckout({
    customerId,
    priceId: STRIPE_PRICE_ID_MONTHLY,
    couponId,
    promotionCodeId,
    successUrl: `${APP_URL}/portal?payment=success`,
    cancelUrl: `${APP_URL}/apply/success`,
    metadata: { email, airtableId: app?.id ?? "" },
  });

  // Persist coupon on the founder's application so /portal/suscripcion shows the discount
  if (app?.id && couponCode) {
    await assignCouponToApplication(app.id, couponCode, discountPct, couponId, promotionCodeId);
  }

  await sendCouponLink(email, firstName, checkoutSession.url!, discountPct);

  return NextResponse.json({ success: true, url: checkoutSession.url });
}

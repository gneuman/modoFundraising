"use server";

import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { getFounderProfile, getAllCoupons, updateApplicationStatus } from "@/lib/airtable";
import { createStripeCustomer, createSubscriptionCheckout, createOneTimeCheckout, STRIPE_PRICE_ID_MONTHLY } from "@/lib/stripe";

export async function iniciarPago(mode: "subscription" | "payment") {
  const session = await obtenerSesion();
  if (!session) redirect("/ingresar");

  const [profile, coupons] = await Promise.all([
    getFounderProfile(session.email),
    getAllCoupons(),
  ]);
  if (!profile?.postulacion_id) throw new Error("Postulación no encontrada");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");
  let customerId = profile.stripe_customer_id as string | undefined;

  if (!customerId) {
    const nombre = `${profile.first_name ?? ""} ${profile.last_name ?? ""} — ${profile.startup_name ?? ""}`.trim();
    const customer = await createStripeCustomer(session.email, nombre);
    customerId = customer.id;
    await updateApplicationStatus(profile.postulacion_id, profile.status ?? "Admitida", { stripe_customer_id: customerId });
  }

  // Resolve coupon IDs fresh from Airtable by coupon_code (same logic as /api/checkout/session)
  const couponCode = profile.coupon_code as string | undefined;
  const couponRecord = couponCode
    ? coupons.find((c) => c.code === couponCode)
    : undefined;
  const couponId = couponRecord?.stripe_coupon_id;
  const promotionCodeId = couponRecord?.stripe_promotion_code_id;

  const successUrl = `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/portal/suscripcion`;
  const metadata = { airtableId: profile.postulacion_id, email: session.email, mode };

  let checkoutSession;
  if (mode === "subscription") {
    checkoutSession = await createSubscriptionCheckout({ customerId, priceId: STRIPE_PRICE_ID_MONTHLY, couponId, promotionCodeId, successUrl, cancelUrl, metadata });
  } else {
    // Pago único: siempre 20% fijo. Cupones NO aplican.
    checkoutSession = await createOneTimeCheckout({ customerId, successUrl, cancelUrl, metadata });
  }

  redirect(checkoutSession.url!);
}

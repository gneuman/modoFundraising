"use server";

import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { getFounderProfile, updateApplicationStatus } from "@/lib/airtable";
import { createStripeCustomer, createSubscriptionCheckout, createOneTimeCheckout, STRIPE_PRICE_ID_MONTHLY } from "@/lib/stripe";

export async function iniciarPago(mode: "subscription" | "payment") {
  const session = await obtenerSesion();
  if (!session) redirect("/auth/login");

  const profile = await getFounderProfile(session.email);
  if (!profile?.postulacion_id) throw new Error("Postulación no encontrada");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");
  let customerId = profile.stripe_customer_id as string | undefined;

  if (!customerId) {
    const nombre = `${profile.first_name ?? ""} ${profile.last_name ?? ""} — ${profile.startup_name ?? ""}`.trim();
    const customer = await createStripeCustomer(session.email, nombre);
    customerId = customer.id;
    await updateApplicationStatus(profile.postulacion_id, profile.status ?? "Admitida", { stripe_customer_id: customerId });
  }

  const successUrl = `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/portal/suscripcion`;
  const metadata = { airtableId: profile.postulacion_id, email: session.email, mode };
  const couponId = (profile as Record<string, unknown>).stripe_coupon_id as string | undefined;

  let checkoutSession;
  if (mode === "subscription") {
    checkoutSession = await createSubscriptionCheckout({ customerId, priceId: STRIPE_PRICE_ID_MONTHLY, couponId, successUrl, cancelUrl, metadata });
  } else {
    checkoutSession = await createOneTimeCheckout({ customerId, couponId, successUrl, cancelUrl, metadata });
  }

  redirect(checkoutSession.url!);
}

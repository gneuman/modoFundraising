"use server";

import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { getAllApplications, updateApplicationStatus } from "@/lib/airtable";
import { createStripeCustomer, createSubscriptionCheckout, createOneTimeCheckout, STRIPE_PRICE_ID_MONTHLY } from "@/lib/stripe";

export async function iniciarPago(mode: "subscription" | "payment") {
  const session = await obtenerSesion();
  if (!session) redirect("/auth/login");

  const apps = await getAllApplications();
  const app = apps.find((a) => a.email === session.email);
  if (!app?.id) throw new Error("Postulación no encontrada");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
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
  const couponId = app.stripe_coupon_id as string | undefined;

  let checkoutSession;
  if (mode === "subscription") {
    checkoutSession = await createSubscriptionCheckout({ customerId, priceId: STRIPE_PRICE_ID_MONTHLY, couponId, successUrl, cancelUrl, metadata });
  } else {
    checkoutSession = await createOneTimeCheckout({ customerId, couponId, successUrl, cancelUrl, metadata });
  }

  redirect(checkoutSession.url!);
}

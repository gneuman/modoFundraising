import { obtenerSesion } from "@/lib/auth";
import { getFounderProfile } from "@/lib/airtable";
import { getSubscriptionSummary, type SubscriptionSummary } from "@/lib/stripe";
import { SuscripcionClient } from "./suscripcion-client";

export const dynamic = "force-dynamic";

export default async function SuscripcionPage() {
  const session = await obtenerSesion();

  let profile = null;
  try {
    profile = await getFounderProfile(session?.email ?? "");
  } catch {
    // Airtable error — render with defaults
  }

  const paymentStatus = profile?.payment_status ?? "Pendiente";
  // Considerar pagado si portal_access=true O si el status ya es "Inscrita"
  const portalAccess = (profile?.portal_access || profile?.status === "Inscrita") ?? false;
  const stripeSubscriptionId = profile?.stripe_subscription_id;
  const discountPercent = profile?.discount_percent;
  // Pago fallido: falló y aún no se resolvió. Habilita el botón de actualizar tarjeta.
  const pagoFallido = !!profile?.payment_failed_at && !profile?.payment_resolved_at;

  // Datos REALES de la suscripción desde Stripe (monto cobrado, cupón, próximo
  // cobro, tarjeta). Solo aplica a suscripciones de cuotas; el pago único no
  // crea suscripción, así que su stripe_subscription_id queda vacío.
  let subscription: SubscriptionSummary | null = null;
  if (stripeSubscriptionId) {
    try {
      subscription = await getSubscriptionSummary(stripeSubscriptionId);
    } catch {
      // Stripe error — el portal degrada a los textos por defecto
    }
  }

  return (
    <SuscripcionClient
      paymentStatus={paymentStatus}
      portalAccess={portalAccess}
      stripeSubscriptionId={stripeSubscriptionId}
      discountPercent={discountPercent}
      pagoFallido={pagoFallido}
      subscription={subscription}
    />
  );
}

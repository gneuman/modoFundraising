import { obtenerSesion } from "@/lib/auth";
import { getFounderProfile } from "@/lib/airtable";
import { SuscripcionClient } from "./suscripcion-client";

export const dynamic = "force-dynamic";

export default async function SuscripcionPage() {
  const session = await obtenerSesion();
  const profile = await getFounderProfile(session?.email ?? "");

  const paymentStatus = profile?.payment_status ?? "Pendiente";
  // Considerar pagado si portal_access=true O si el status ya es "Inscrita"
  const portalAccess = (profile?.portal_access || profile?.status === "Inscrita") ?? false;
  const stripeSubscriptionId = profile?.stripe_subscription_id;

  return (
    <SuscripcionClient
      paymentStatus={paymentStatus}
      portalAccess={portalAccess}
      stripeSubscriptionId={stripeSubscriptionId}
    />
  );
}

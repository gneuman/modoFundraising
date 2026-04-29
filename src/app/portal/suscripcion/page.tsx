import { obtenerSesionDeHeaders as obtenerSesion } from "@/lib/auth";
import { getFounderProfile } from "@/lib/airtable";
import { SuscripcionClient } from "./suscripcion-client";

export const dynamic = "force-dynamic";

export default async function SuscripcionPage() {
  const session = await obtenerSesion();
  const profile = await getFounderProfile(session?.email ?? "");

  const paymentStatus = profile?.payment_status ?? "Pendiente";
  const portalAccess = profile?.portal_access ?? false;

  return <SuscripcionClient paymentStatus={paymentStatus} portalAccess={portalAccess} />;
}

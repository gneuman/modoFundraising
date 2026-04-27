import { obtenerSesion } from "@/lib/auth";
import { getFounderByEmail } from "@/lib/airtable";
import { SuscripcionClient } from "./suscripcion-client";

export const dynamic = "force-dynamic";

export default async function SuscripcionPage() {
  const session = await obtenerSesion();
  const app = await getFounderByEmail(session?.email ?? "");

  const paymentStatus = app?.payment_status ?? "Pendiente";
  const portalAccess = app?.portal_access ?? false;

  return <SuscripcionClient paymentStatus={paymentStatus} portalAccess={portalAccess} />;
}

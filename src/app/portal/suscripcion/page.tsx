import { obtenerSesion } from "@/lib/auth";
import { getAllApplications } from "@/lib/airtable";
import { SuscripcionClient } from "./suscripcion-client";

export const dynamic = "force-dynamic";

export default async function SuscripcionPage() {
  const session = await obtenerSesion();
  const apps = await getAllApplications();
  const app = apps.find((a) => a.email === session?.email);

  const paymentStatus = app?.payment_status ?? "Pendiente";

  return <SuscripcionClient paymentStatus={paymentStatus} />;
}

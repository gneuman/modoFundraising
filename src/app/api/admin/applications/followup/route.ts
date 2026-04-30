import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { getAllApplications, updateApplicationStatus } from "@/lib/airtable";
import { sendAdmissionFollowUp } from "@/lib/gmail";
import { createCheckoutToken } from "@/lib/checkout-token";

// POST /api/admin/applications/followup
// Envía correo de seguimiento a todas las postulaciones "Admitida" sin pago completado.
export async function POST() {
  const session = await obtenerSesion();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await getAllApplications();

  const pendientes = apps.filter(
    (a) =>
      a.status === "Admitida" &&
      (!a.payment_status || a.payment_status === "Pendiente")
  );

  if (pendientes.length === 0) {
    return NextResponse.json({ sent: 0, message: "No hay admitidas sin pago" });
  }

  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  const results = await Promise.allSettled(
    pendientes.map(async (app) => {
      const followUpNumber = app.follow_up_1_sent ? 2 : 1;
      const token = await createCheckoutToken({
        airtableId: app.id!,
        email: app.email!,
        firstName: app.first_name!,
        startupName: app.startup_name!,
        stripeCouponId: app.stripe_coupon_id as string | undefined,
        discountPercent: app.discount_percent ? Number(app.discount_percent) : undefined,
      });
      const checkoutUrl = `${APP_URL}/checkout/${token}`;
      await sendAdmissionFollowUp(app.email!, app.first_name!, checkoutUrl, followUpNumber);
      // Marca en Airtable qué seguimiento fue enviado — el admin mueve el status manualmente
      const flagField = followUpNumber === 1 ? { follow_up_1_sent: true } : { follow_up_2_sent: true };
      await updateApplicationStatus(app.id!, "Admitida", flagField);
      return { id: app.id, email: app.email, followUpNumber };
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const errors = results
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason?.message ?? "Error");

  return NextResponse.json({ sent, total: pendientes.length, errors });
}

// GET /api/admin/applications/followup
// Devuelve las postulaciones admitidas sin pago (preview antes de enviar).
export async function GET() {
  const session = await obtenerSesion();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await getAllApplications();

  const pendientes = apps
    .filter(
      (a) =>
        a.status === "Admitida" &&
        (!a.payment_status || a.payment_status === "Pendiente")
    )
    .map((a) => ({
      id: a.id,
      startup_name: a.startup_name,
      first_name: a.first_name,
      email: a.email,
      follow_up_1_sent: a.follow_up_1_sent,
      follow_up_2_sent: a.follow_up_2_sent,
      created_at: a.created_at,
    }));

  return NextResponse.json({ count: pendientes.length, items: pendientes });
}

import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { getFounderProfile } from "@/lib/airtable";
import { findFailedSubByEmail, createBillingPortalLink } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/portal/billing-portal
 *
 * Para el founder logueado cuya tarjeta falló: genera un link al Stripe Billing
 * Portal donde puede actualizar su método de pago. Al actualizar la tarjeta,
 * Stripe reintenta automáticamente la factura pendiente.
 *
 * Devuelve { url } con la sesión del Billing Portal, o error si no hay customer.
 */
export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || session.role !== "founder") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const profile = await getFounderProfile(session.email);
  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  // Resolver customer: el del perfil, o buscarlo por email en Stripe como respaldo.
  let customerId = profile.stripe_customer_id;
  if (!customerId) {
    const info = await findFailedSubByEmail(session.email);
    customerId = info.customerId ?? undefined;
  }
  if (!customerId) {
    return NextResponse.json(
      { error: "No encontramos tu información de pago. Escríbenos a admin@impacta.vc." },
      { status: 404 }
    );
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const url = await createBillingPortalLink(customerId, `${appUrl}/portal/suscripcion`);

  return NextResponse.json({ url });
}

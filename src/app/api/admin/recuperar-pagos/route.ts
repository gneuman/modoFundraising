export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { stripe, createBillingPortalLink } from "@/lib/stripe";
import { getAllApplications, type PostulacionRecord } from "@/lib/airtable";
import Stripe from "stripe";

/**
 * /api/admin/recuperar-pagos
 *
 * Herramienta de cobranza para el admin: dado una postulación (Inscrita o con
 * pago pendiente), diagnostica qué hay en Stripe y permite generar el link
 * adecuado para mandarle al founder.
 *
 *  GET                    → diagnóstico de todas las inscritas
 *  POST { airtableId, kind: "billing_portal" }   → link al Stripe Billing Portal
 *  POST { airtableId, kind: "checkout", amountUsd, description? }
 *                         → Checkout one-time con monto custom
 */

type StripeDiag = {
  customerId: string | null;
  subId: string | null;
  subStatus: string | null;
  facturasPagadas: number;
  facturasAbiertas: number;
  montoPendienteUsd: number;
  cardBrand: string | null;
  cardLast4: string | null;
};

async function diagnosticarStripe(app: PostulacionRecord): Promise<StripeDiag> {
  const out: StripeDiag = {
    customerId: null, subId: null, subStatus: null,
    facturasPagadas: 0, facturasAbiertas: 0, montoPendienteUsd: 0,
    cardBrand: null, cardLast4: null,
  };
  if (!app.email) return out;

  let customerId = app.stripe_customer_id ?? null;
  if (!customerId) {
    const list = await stripe.customers.list({ email: app.email, limit: 5 });
    customerId = list.data[0]?.id ?? null;
  }
  if (!customerId) return out;
  out.customerId = customerId;

  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
  const problem = subs.data.find((s) => ["past_due", "unpaid", "incomplete"].includes(s.status));
  const active = subs.data.find((s) => s.status === "active");
  const sub = problem ?? active ?? subs.data[0] ?? null;
  if (sub) { out.subId = sub.id; out.subStatus = sub.status; }

  const invs = await stripe.invoices.list({ customer: customerId, limit: 24, expand: ["data.charge"] });
  for (const inv of invs.data) {
    if (inv.status === "paid") out.facturasPagadas++;
    if (inv.status === "open") {
      out.facturasAbiertas++;
      out.montoPendienteUsd += (inv.amount_due ?? 0) / 100;
    }
    const charge = (inv as { charge?: unknown }).charge;
    if (charge && typeof charge !== "string" && !out.cardBrand) {
      const det = (charge as Stripe.Charge).payment_method_details?.card;
      if (det) { out.cardBrand = det.brand ?? null; out.cardLast4 = det.last4 ?? null; }
    }
  }
  return out;
}

function decidirAccion(app: PostulacionRecord, s: StripeDiag): {
  tipo: "ok_auto" | "billing_portal" | "checkout" | "completado" | "sin_email" | "revisar";
  detalle: string;
} {
  if (!app.email) return { tipo: "sin_email", detalle: "Postulación sin email" };
  const total = app.total_cuotas ?? 3;
  if (s.subStatus === "past_due" || s.subStatus === "unpaid") {
    return { tipo: "billing_portal", detalle: `Tarjeta falló — US$${s.montoPendienteUsd.toFixed(2)} pendiente` };
  }
  if (s.subStatus === "incomplete") {
    return { tipo: "billing_portal", detalle: "Suscripción incompleta — actualizar método de pago" };
  }
  if (s.subStatus === "active" && s.facturasAbiertas === 0) {
    return { tipo: "ok_auto", detalle: `Stripe cobrará la próxima cuota (${s.facturasPagadas}/${total} pagadas)` };
  }
  if (s.subStatus === "canceled" && s.facturasPagadas >= total) {
    return { tipo: "completado", detalle: `Plan completado (${s.facturasPagadas}/${total})` };
  }
  if (s.subStatus === "canceled" && s.facturasPagadas < total) {
    return { tipo: "checkout", detalle: `Sub cancelada con ${s.facturasPagadas}/${total} cuotas — generar Checkout por cuota faltante` };
  }
  if (!s.subId && s.facturasPagadas === 0) {
    return { tipo: "checkout", detalle: "Sin suscripción ni pagos en Stripe — generar Checkout" };
  }
  if (!s.subId && s.facturasPagadas >= total) {
    return { tipo: "completado", detalle: `Pago único completado (${s.facturasPagadas} facturas)` };
  }
  return { tipo: "revisar", detalle: `status=${s.subStatus ?? "ninguna"} pagadas=${s.facturasPagadas}/${total} abiertas=${s.facturasAbiertas}` };
}

export async function GET(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const apps = await getAllApplications();
  const target = apps.filter((a) =>
    a.status === "Inscrita" || a.status === "Invitada institucional"
    || (a.payment_status && a.payment_status !== "Pendiente" && a.payment_status !== "Beca 100%")
  );

  const rows = await Promise.all(target.map(async (app) => {
    try {
      const s = await diagnosticarStripe(app);
      const a = decidirAccion(app, s);
      return {
        airtableId: app.id!,
        startup_name: app.startup_name ?? "",
        email: app.email ?? "",
        payment_status: app.payment_status ?? "",
        total_cuotas: app.total_cuotas ?? null,
        portal_access: app.portal_access ?? false,
        airtable_customer_id: app.stripe_customer_id ?? null,
        airtable_sub_id: app.stripe_subscription_id ?? null,
        stripe: s,
        accion: a.tipo,
        accion_detalle: a.detalle,
      };
    } catch (err) {
      return {
        airtableId: app.id!,
        startup_name: app.startup_name ?? "",
        email: app.email ?? "",
        payment_status: app.payment_status ?? "",
        total_cuotas: app.total_cuotas ?? null,
        portal_access: app.portal_access ?? false,
        airtable_customer_id: app.stripe_customer_id ?? null,
        airtable_sub_id: app.stripe_subscription_id ?? null,
        stripe: null,
        accion: "revisar" as const,
        accion_detalle: `Error Stripe: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }));

  rows.sort((a, b) => {
    const order = { billing_portal: 0, checkout: 1, revisar: 2, ok_auto: 3, completado: 4, sin_email: 5 } as const;
    return order[a.accion] - order[b.accion] || a.startup_name.localeCompare(b.startup_name);
  });

  return NextResponse.json({ count: rows.length, rows });
}

export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const airtableId = String(body?.airtableId ?? "");
  const kind = String(body?.kind ?? "");
  if (!airtableId || !["billing_portal", "checkout"].includes(kind)) {
    return NextResponse.json({ error: "Falta airtableId o kind inválido" }, { status: 400 });
  }

  const apps = await getAllApplications();
  const app = apps.find((a) => a.id === airtableId);
  if (!app) return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });
  if (!app.email) return NextResponse.json({ error: "Postulación sin email" }, { status: 400 });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  // Resolver customer (Airtable → Stripe por email → crear)
  let customerId = app.stripe_customer_id ?? null;
  if (!customerId) {
    const list = await stripe.customers.list({ email: app.email, limit: 5 });
    customerId = list.data[0]?.id ?? null;
  }

  if (kind === "billing_portal") {
    if (!customerId) {
      return NextResponse.json({ error: "Este founder no tiene customer en Stripe. Usa Checkout en su lugar." }, { status: 400 });
    }
    const url = await createBillingPortalLink(customerId, `${appUrl}/portal/suscripcion`);
    return NextResponse.json({ kind, url, customerId });
  }

  // kind === "checkout": Checkout one-time con monto custom
  const amountUsd = Number(body?.amountUsd);
  if (!amountUsd || amountUsd <= 0) {
    return NextResponse.json({ error: "Falta amountUsd válido" }, { status: 400 });
  }
  const description = String(body?.description ?? `Modo Fundraising 2026 — ${app.startup_name ?? ""}`).trim();

  if (!customerId) {
    const nombre = `${app.first_name ?? ""} ${app.last_name ?? ""} — ${app.startup_name ?? ""}`.trim();
    const c = await stripe.customers.create({ email: app.email, name: nombre });
    customerId = c.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: description },
        unit_amount: Math.round(amountUsd * 100),
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/portal/suscripcion?recovered=1`,
    cancel_url: `${appUrl}/portal/suscripcion`,
    payment_method_types: ["card"],
    metadata: {
      airtableId: app.id ?? "",
      email: app.email,
      recovery: "true",
      kind: "admin_recovery_checkout",
    },
  });

  return NextResponse.json({ kind, url: session.url, customerId, sessionId: session.id });
}

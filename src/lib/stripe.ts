import Stripe from "stripe";

const isProduction = process.env.STRIPE_MODE === "production";

const stripeSecretKey = isProduction
  ? process.env.STRIPE_SECRET_KEY_PROD!
  : process.env.STRIPE_SECRET_KEY_TEST!;

export const STRIPE_MODE = isProduction ? "production" : "test";

export const STRIPE_PRICE_ID_MONTHLY = isProduction
  ? process.env.STRIPE_PRICE_ID_MONTHLY_PROD!
  : process.env.STRIPE_PRICE_ID_MONTHLY_TEST!;

export const STRIPE_PRICE_ID_ONETIME = isProduction
  ? process.env.STRIPE_PRICE_ID_ONETIME_PROD!
  : process.env.STRIPE_PRICE_ID_ONETIME_TEST!;

export const STRIPE_WEBHOOK_SECRET = isProduction
  ? process.env.STRIPE_WEBHOOK_SECRET_PROD!
  : process.env.STRIPE_WEBHOOK_SECRET_TEST!;

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-03-25.dahlia",
});

export const PROGRAM_PRICE_USD = 349;

// Descuento fijo aplicado SIEMPRE al pago único (independiente del código de cupón)
export const ONETIME_FIXED_DISCOUNT = 20;

// Descuentos permitidos (%)
export const ALLOWED_DISCOUNTS = [10, 15, 20, 25, 50, 100] as const;
export type DiscountPercent = (typeof ALLOWED_DISCOUNTS)[number];

export async function createStripeCustomer(email: string, name: string) {
  return stripe.customers.create({ email, name });
}

export async function createSubscriptionCheckout({
  customerId,
  priceId,
  couponId,
  promotionCodeId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId: string;
  priceId: string;
  couponId?: string;
  promotionCodeId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const params: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: {
      metadata: metadata ?? {},
    },
    payment_method_types: ["card"],
  };

  if (promotionCodeId) {
    params.discounts = [{ promotion_code: promotionCodeId }];
  } else if (couponId) {
    params.discounts = [{ coupon: couponId }];
  } else {
    params.allow_promotion_codes = true;
  }

  return stripe.checkout.sessions.create(params);
}

// Create a coupon in Stripe (e.g. 50% off, forever or for 3 months)
export async function createStripeCoupon({
  name,
  percentOff,
  durationMonths = 3,
}: {
  name: string;
  percentOff: DiscountPercent;
  durationMonths?: number;
}) {
  // 100% = beca completa → duration "repeating" 3 months
  const coupon = await stripe.coupons.create({
    name,
    percent_off: percentOff,
    duration: "repeating",
    duration_in_months: durationMonths,
    currency: "usd",
  });
  return coupon;
}

// Create a promotion code for a coupon (readable code like "ALUMNIMF50")
export async function createStripePromoCode(couponId: string, code: string) {
  return stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: couponId },
    code: code.toUpperCase(),
  });
}

// Pago único: SIEMPRE aplica 20% off fijo. Cupones NO aplican a esta modalidad.
export async function createOneTimeCheckout({
  customerId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const dynamicCoupon = await stripe.coupons.create({
    name: `Pago único ${ONETIME_FIXED_DISCOUNT}%`,
    percent_off: ONETIME_FIXED_DISCOUNT,
    duration: "once",
    max_redemptions: 1,
    currency: "usd",
    metadata: {
      ...(metadata ?? {}),
      fixed_pct: String(ONETIME_FIXED_DISCOUNT),
    },
  });

  const params: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: "payment",
    line_items: [{ price: STRIPE_PRICE_ID_ONETIME, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    payment_method_types: ["card"],
    discounts: [{ coupon: dynamicCoupon.id }],
  };

  return stripe.checkout.sessions.create(params);
}

export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.cancel(subscriptionId);
}

export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function constructWebhookEvent(payload: string, sig: string) {
  return stripe.webhooks.constructEvent(
    payload,
    sig,
    STRIPE_WEBHOOK_SECRET
  );
}

export async function listCoupons() {
  return stripe.coupons.list({ limit: 100 });
}

// ── Recuperación de pago: actualizar tarjeta de una suscripción existente ──────
// Para founders cuya suscripción (creada a mano en Stripe) tiene la tarjeta
// fallida. Genera un link al Billing Portal donde actualizan el método de pago;
// Stripe reintenta automáticamente la factura past_due con la tarjeta nueva.

export type FailedSubInfo = {
  email: string;
  customerId: string | null;
  subscriptionId: string | null;
  subStatus: string | null;
  openInvoiceId: string | null;
  amountDue: number | null;
  portalUrl: string | null;
  note: string;
};

// Busca el customer por email y su suscripción con cobro pendiente.
export async function findFailedSubByEmail(email: string): Promise<FailedSubInfo> {
  const base: FailedSubInfo = {
    email,
    customerId: null,
    subscriptionId: null,
    subStatus: null,
    openInvoiceId: null,
    amountDue: null,
    portalUrl: null,
    note: "",
  };

  const customers = await stripe.customers.list({ email, limit: 10 });
  if (customers.data.length === 0) {
    return { ...base, note: "Sin customer en Stripe con ese email" };
  }
  // Si hay varios customers con el mismo email, elegir el que tenga una sub problemática.
  let chosenCustomer = customers.data[0];
  let problemSub: Stripe.Subscription | null = null;

  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    });
    const failing = subs.data.find((s) =>
      ["past_due", "unpaid", "incomplete"].includes(s.status)
    );
    if (failing) {
      chosenCustomer = customer;
      problemSub = failing;
      break;
    }
  }

  if (!problemSub) {
    return {
      ...base,
      customerId: chosenCustomer.id,
      note: "Customer existe pero sin suscripción en estado past_due/unpaid/incomplete",
    };
  }

  // Buscar la factura abierta de esa suscripción para mostrar el monto.
  let openInvoiceId: string | null = null;
  let amountDue: number | null = null;
  try {
    const invoices = await stripe.invoices.list({
      customer: chosenCustomer.id,
      status: "open",
      limit: 5,
    });
    const inv = invoices.data.find(
      (i) => (i as { subscription?: string }).subscription === problemSub!.id
    ) ?? invoices.data[0];
    if (inv) {
      openInvoiceId = inv.id ?? null;
      amountDue = (inv.amount_due ?? 0) / 100;
    }
  } catch {
    // monto es informativo; no bloquear si falla
  }

  return {
    ...base,
    customerId: chosenCustomer.id,
    subscriptionId: problemSub.id,
    subStatus: problemSub.status,
    openInvoiceId,
    amountDue,
    note: "OK",
  };
}

// Crea un link al Billing Portal para que el founder actualice su tarjeta.
export async function createBillingPortalLink(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

// Historial de cobro de un customer: cómo se le cobró antes (facturas + tarjeta).
export type InvoiceHistoryItem = {
  invoiceId: string | null;
  created: string;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  billingReason: string | null;
  attemptCount: number | null;
  failureMessage: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  hostedInvoiceUrl: string | null;
};

// ── Reembolsos ────────────────────────────────────────────────────────────────
// Lista los refunds más recientes de Stripe, con email del customer asociado.
// El admin necesita ver quién pidió reembolso para dar seguimiento.

export type RefundItem = {
  refundId: string;
  amount: number;
  currency: string;
  status: string | null;
  reason: string | null;
  created: string;
  email: string | null;
  customerId: string | null;
  chargeId: string | null;
  receiptUrl: string | null;
};

export async function listRecentRefunds(limit = 50): Promise<RefundItem[]> {
  const refunds = await stripe.refunds.list({
    limit,
    expand: ["data.charge"],
  });

  const items: RefundItem[] = [];
  for (const r of refunds.data) {
    const charge = r.charge;
    let email: string | null = null;
    let customerId: string | null = null;
    let chargeId: string | null = null;
    let receiptUrl: string | null = null;

    if (charge && typeof charge !== "string") {
      const c = charge as Stripe.Charge;
      chargeId = c.id;
      email = c.billing_details?.email ?? c.receipt_email ?? null;
      customerId = typeof c.customer === "string" ? c.customer : c.customer?.id ?? null;
      receiptUrl = c.receipt_url ?? null;

      // Fallback: si no hay email en el charge pero sí customer, leerlo del customer.
      if (!email && customerId) {
        try {
          const cust = await stripe.customers.retrieve(customerId);
          if (!("deleted" in cust)) {
            email = cust.email ?? null;
          }
        } catch {
          // informativo
        }
      }
    } else if (typeof charge === "string") {
      chargeId = charge;
    }

    items.push({
      refundId: r.id,
      amount: (r.amount ?? 0) / 100,
      currency: (r.currency ?? "usd").toUpperCase(),
      status: r.status ?? null,
      reason: r.reason ?? null,
      created: new Date(r.created * 1000).toISOString(),
      email,
      customerId,
      chargeId,
      receiptUrl,
    });
  }

  return items;
}

export async function getCustomerBillingHistory(customerId: string): Promise<{
  defaultCard: { brand: string | null; last4: string | null; expMonth: number | null; expYear: number | null } | null;
  invoices: InvoiceHistoryItem[];
}> {
  // Tarjeta por defecto del customer (la que Stripe intenta cobrar).
  let defaultCard = null;
  try {
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    if (!("deleted" in customer)) {
      const pm = customer.invoice_settings?.default_payment_method;
      if (pm && typeof pm !== "string" && pm.card) {
        defaultCard = {
          brand: pm.card.brand ?? null,
          last4: pm.card.last4 ?? null,
          expMonth: pm.card.exp_month ?? null,
          expYear: pm.card.exp_year ?? null,
        };
      }
    }
  } catch {
    // informativo
  }

  const list = await stripe.invoices.list({
    customer: customerId,
    limit: 24,
    expand: ["data.charge"],
  });

  const invoices: InvoiceHistoryItem[] = list.data.map((inv) => {
    const charge = (inv as { charge?: unknown }).charge;
    let cardBrand: string | null = null;
    let cardLast4: string | null = null;
    let failureMessage: string | null = null;
    if (charge && typeof charge !== "string") {
      const c = charge as Stripe.Charge;
      const det = c.payment_method_details?.card;
      cardBrand = det?.brand ?? null;
      cardLast4 = det?.last4 ?? null;
      failureMessage = c.failure_message ?? null;
    }
    return {
      invoiceId: inv.id ?? null,
      created: new Date(inv.created * 1000).toISOString(),
      status: inv.status ?? null,
      amountDue: (inv.amount_due ?? 0) / 100,
      amountPaid: (inv.amount_paid ?? 0) / 100,
      billingReason: inv.billing_reason ?? null,
      attemptCount: inv.attempt_count ?? null,
      failureMessage,
      cardBrand,
      cardLast4,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    };
  });

  return { defaultCard, invoices };
}

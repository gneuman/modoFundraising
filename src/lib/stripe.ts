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

// Pago único: $1,047 - $210 = $837 (no usamos percent_off porque 20% de $1,047 = $837.60).
export const ONETIME_DISCOUNT_USD = 210;

// Descuentos permitidos (%)
export const ALLOWED_DISCOUNTS = [10, 15, 20, 25, 50, 100] as const;
export type DiscountPercent = (typeof ALLOWED_DISCOUNTS)[number];

// Marca de origen para distinguir pagos creados por la app vs creados a mano en el dashboard.
// Si un Customer/Checkout/Subscription en Stripe NO tiene `source: "app_checkout"`,
// fue creado manualmente en el dashboard.
export const APP_SOURCE_TAG = { source: "app_checkout" } as const;

export async function createStripeCustomer(email: string, name: string) {
  return stripe.customers.create({ email, name, metadata: { ...APP_SOURCE_TAG } });
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
  const taggedMetadata = { ...APP_SOURCE_TAG, ...(metadata ?? {}) };
  const params: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: taggedMetadata,
    subscription_data: {
      metadata: taggedMetadata,
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
  const taggedMetadata = { ...APP_SOURCE_TAG, ...(metadata ?? {}) };
  const dynamicCoupon = await stripe.coupons.create({
    name: `Pago único -US$${ONETIME_DISCOUNT_USD}`,
    amount_off: ONETIME_DISCOUNT_USD * 100,
    currency: "usd",
    duration: "once",
    max_redemptions: 1,
    metadata: {
      ...taggedMetadata,
      fixed_amount_usd: String(ONETIME_DISCOUNT_USD),
    },
  });

  const params: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: "payment",
    line_items: [{ price: STRIPE_PRICE_ID_ONETIME, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: taggedMetadata,
    payment_method_types: ["card"],
    discounts: [{ coupon: dynamicCoupon.id }],
    payment_intent_data: {
      metadata: taggedMetadata,
    },
  };

  return stripe.checkout.sessions.create(params);
}

export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.cancel(subscriptionId);
}

export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

// ── Resumen de la suscripción para el portal del founder ──────────────────────
// Lee el estado REAL desde Stripe (monto cobrado, cupón aplicado, próximo cobro,
// tarjeta) en lugar de mostrar precios fijos/adivinados. Es la fuente de verdad
// que ve el founder en /portal/suscripcion.
export type SubscriptionSummary = {
  found: boolean;
  status: string | null; // active, past_due, canceled, ...
  amount: number | null; // monto por cobro DESPUÉS de descuento (USD)
  baseAmount: number | null; // monto de lista antes de descuento (USD)
  currency: string;
  interval: string | null; // "month"
  currentPeriodEnd: string | null; // ISO — próximo cobro
  cancelAtPeriodEnd: boolean;
  cuotasPagadas: number | null; // # de facturas pagadas de esta sub
  totalCuotas: number | null; // # total de cuotas del plan (metadata)
  coupon: {
    name: string | null;
    percentOff: number | null;
    amountOff: number | null; // USD
    code: string | null; // promotion code legible, si aplica
  } | null;
  card: { brand: string | null; last4: string | null } | null;
};

export async function getSubscriptionSummary(
  subscriptionId: string,
): Promise<SubscriptionSummary> {
  const empty: SubscriptionSummary = {
    found: false,
    status: null,
    amount: null,
    baseAmount: null,
    currency: "USD",
    interval: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    cuotasPagadas: null,
    totalCuotas: null,
    coupon: null,
    card: null,
  };

  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: [
        "discounts.source.coupon",
        "discounts.promotion_code",
        "default_payment_method",
        "items.data.price",
      ],
    });
  } catch {
    return empty;
  }

  const item = sub.items?.data?.[0];
  const price = item?.price;
  const baseUnit = price?.unit_amount != null ? price.unit_amount / 100 : null;
  const currency = (price?.currency ?? "usd").toUpperCase();
  const interval = price?.recurring?.interval ?? null;

  // Descuento activo en la suscripción. En esta API el descuento vive en
  // sub.discounts[]; cada uno referencia un coupon (y opcionalmente un
  // promotion_code legible).
  let couponInfo: SubscriptionSummary["coupon"] = null;
  let percentOff: number | null = null;
  let amountOff: number | null = null;
  const rawDiscounts = (sub as unknown as { discounts?: unknown }).discounts;
  const firstDiscount = Array.isArray(rawDiscounts) ? rawDiscounts[0] : rawDiscounts;
  const discount =
    firstDiscount && typeof firstDiscount !== "string"
      ? (firstDiscount as Stripe.Discount)
      : null;
  // En esta versión de la API el cupón vive en discount.source.coupon
  // (antes era discount.coupon directamente).
  const couponRef = discount?.source?.coupon;
  const c =
    couponRef && typeof couponRef !== "string"
      ? (couponRef as Stripe.Coupon)
      : null;
  if (discount && c) {
    percentOff = c.percent_off ?? null;
    amountOff = c.amount_off != null ? c.amount_off / 100 : null;
    let code: string | null = null;
    const promo = discount.promotion_code;
    if (promo && typeof promo !== "string") code = promo.code ?? null;
    couponInfo = {
      name: c.name ?? null,
      percentOff,
      amountOff,
      code,
    };
  }

  // Monto que realmente se cobra por período (base menos descuento).
  let amount = baseUnit;
  if (baseUnit != null) {
    if (percentOff != null) amount = Math.round(baseUnit * (1 - percentOff / 100));
    else if (amountOff != null) amount = Math.max(0, baseUnit - amountOff);
  }

  // Próximo cobro: current_period_end vive en el item de la suscripción.
  const periodEnd =
    (item as unknown as { current_period_end?: number })?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    null;

  const totalCuotasRaw = sub.metadata?.total_cuotas;
  const totalCuotas = totalCuotasRaw ? Number(totalCuotasRaw) : null;

  // # de facturas pagadas de esta suscripción (cuotas ya abonadas).
  let cuotasPagadas: number | null = null;
  try {
    const invs = await stripe.invoices.list({
      subscription: subscriptionId,
      status: "paid",
      limit: 12,
    });
    cuotasPagadas = invs.data.length;
  } catch {
    // informativo
  }

  // Tarjeta por defecto de la suscripción.
  let card: SubscriptionSummary["card"] = null;
  const pm = sub.default_payment_method;
  if (pm && typeof pm !== "string" && pm.card) {
    card = { brand: pm.card.brand ?? null, last4: pm.card.last4 ?? null };
  }

  return {
    found: true,
    status: sub.status ?? null,
    amount,
    baseAmount: baseUnit,
    currency,
    interval,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    cuotasPagadas,
    totalCuotas: totalCuotas && !Number.isNaN(totalCuotas) ? totalCuotas : null,
    coupon: couponInfo,
    card,
  };
}

// Resuelve la suscripción cancelable de un customer cuando el subscription_id
// no está guardado en Airtable (migración / webhook viejo — ver WI-1818).
// Devuelve la suscripción activa/al-día más reciente, o null si no hay ninguna
// (ej. pago único: no tiene suscripción, no se puede cancelar).
export async function findCancelableSubscriptionByCustomer(
  customerId: string,
): Promise<string | null> {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  const cancelable = subs.data
    .filter((s) => ["active", "past_due", "trialing", "unpaid"].includes(s.status))
    .sort((a, b) => b.created - a.created)[0];
  return cancelable?.id ?? null;
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

export async function listRecentRefunds(
  options: { limit?: number; createdGte?: number; createdLt?: number } = {},
): Promise<RefundItem[]> {
  const { limit, createdGte, createdLt } = options;
  const pageSize = Math.min(limit ?? 100, 100);

  const created: Stripe.RangeQueryParam = {};
  if (createdGte !== undefined) created.gte = createdGte;
  if (createdLt !== undefined) created.lt = createdLt;

  const raw: Stripe.Refund[] = [];
  for await (const r of stripe.refunds.list({
    limit: pageSize,
    expand: ["data.charge"],
    ...(createdGte !== undefined || createdLt !== undefined ? { created } : {}),
  })) {
    raw.push(r);
    if (limit !== undefined && raw.length >= limit) break;
  }

  const items: RefundItem[] = [];
  for (const r of raw) {
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

// ── Pagos (charges) — fuente oficial de revenue ───────────────────────────────
// Lee todos los charges exitosos de Stripe directo, sin pasar por Airtable.
// Necesario porque los registros viejos en Airtable redondearon US$837.60 a
// US$837 y el revenue ya no cuadra. Stripe es la fuente de verdad.

export type StripePagoItem = {
  chargeId: string;
  paymentIntentId: string | null;
  customerId: string | null;
  email: string | null;
  startupName: string | null;
  amount: number;
  amountRefunded: number;
  amountNet: number;
  currency: string;
  status: string;
  paid: boolean;
  refunded: boolean;
  created: string;
  receiptUrl: string | null;
};

export async function listAllPagosFromStripe(
  options: { createdGte?: number; createdLt?: number } = {},
): Promise<StripePagoItem[]> {
  const { createdGte, createdLt } = options;
  const created: Stripe.RangeQueryParam = {};
  if (createdGte !== undefined) created.gte = createdGte;
  if (createdLt !== undefined) created.lt = createdLt;

  const items: StripePagoItem[] = [];
  for await (const c of stripe.charges.list({
    limit: 100,
    expand: ["data.customer"],
    ...(createdGte !== undefined || createdLt !== undefined ? { created } : {}),
  })) {
    if (c.status !== "succeeded") continue;

    const customer = c.customer;
    let customerId: string | null = null;
    let email: string | null = c.billing_details?.email ?? c.receipt_email ?? null;
    if (customer && typeof customer !== "string") {
      if (!("deleted" in customer)) {
        customerId = customer.id;
        if (!email) email = customer.email ?? null;
      }
    } else if (typeof customer === "string") {
      customerId = customer;
    }

    const amount = (c.amount ?? 0) / 100;
    const amountRefunded = (c.amount_refunded ?? 0) / 100;

    items.push({
      chargeId: c.id,
      paymentIntentId: typeof c.payment_intent === "string" ? c.payment_intent : c.payment_intent?.id ?? null,
      customerId,
      email,
      startupName: c.metadata?.startupName ?? c.metadata?.startup_name ?? null,
      amount,
      amountRefunded,
      amountNet: amount - amountRefunded,
      currency: (c.currency ?? "usd").toUpperCase(),
      status: c.status,
      paid: c.paid,
      refunded: c.refunded,
      created: new Date(c.created * 1000).toISOString(),
      receiptUrl: c.receipt_url ?? null,
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

import { createCheckoutToken } from "@/lib/checkout-token";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

/**
 * Construye la URL de checkout para una postulación admitida.
 * Se usa tanto en el PATCH del admin como en el webhook Airtable → backend,
 * por eso vive en lib compartida.
 *
 * Stripe coupon IDs empiezan con "coup_"; lo demás se trata como promotion code ID.
 */
export async function buildCheckoutUrl(
  recordId: string,
  app: {
    email?: string;
    first_name?: string;
    startup_name?: string;
    stripe_coupon_id?: unknown;
    stripe_promotion_code_id?: unknown;
    discount_percent?: unknown;
  },
): Promise<string> {
  const rawId = (app.stripe_promotion_code_id || app.stripe_coupon_id) as string | undefined;
  const isCoupon = rawId?.startsWith("coup_");
  const token = await createCheckoutToken({
    airtableId: recordId,
    email: app.email!,
    firstName: app.first_name!,
    startupName: app.startup_name!,
    stripeCouponId: isCoupon ? rawId : undefined,
    stripePromotionCodeId: isCoupon ? undefined : rawId,
    discountPercent: app.discount_percent ? Number(app.discount_percent) : undefined,
  });
  return `${APP_URL}/checkout/${token}`;
}

import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface CheckoutPayload {
  airtableId: string;
  email: string;
  firstName: string;
  startupName: string;
  stripeCouponId?: string;
  discountPercent?: number;
}

// 7-day checkout link token
export async function createCheckoutToken(payload: CheckoutPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyCheckoutToken(token: string): Promise<CheckoutPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as CheckoutPayload;
  } catch {
    return null;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("mf_session");
  const secret = process.env.JWT_SECRET;

  if (!cookie) {
    return NextResponse.json({ status: "no_cookie", secret_set: !!secret });
  }

  try {
    const key = new TextEncoder().encode(secret!);
    const { payload } = await jwtVerify(cookie.value, key);
    return NextResponse.json({ status: "ok", email: payload.email, role: payload.role, secret_set: !!secret });
  } catch (e) {
    return NextResponse.json({ status: "jwt_error", error: String(e), secret_set: !!secret, cookie_length: cookie.value.length });
  }
}

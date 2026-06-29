import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getFounderProfile } from "@/lib/airtable";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("mf_session");
  const secret = process.env.JWT_SECRET;

  if (!cookie) {
    return NextResponse.json({ status: "no_cookie", secret_set: !!secret });
  }

  try {
    const key = new TextEncoder().encode(secret!);
    const { payload } = await jwtVerify(cookie.value, key);
    const email = payload.email as string;

    let profile = null;
    let profileError = null;
    try {
      profile = await getFounderProfile(email);
    } catch (e) {
      profileError = String(e);
    }

    return NextResponse.json({
      status: "ok",
      email,
      role: payload.role,
      secret_set: !!secret,
      portal_access: profile?.portal_access ?? null,
      profile_found: !!profile,
      profileError,
    });
  } catch (e) {
    return NextResponse.json({ status: "jwt_error", error: String(e), secret_set: !!secret });
  }
}

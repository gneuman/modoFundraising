import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { esAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const tokenFromHeaders = cookieStore.get("mf_session")?.value;
  const token = req.cookies.get("mf_session")?.value;
  const secret = process.env.JWT_SECRET;
  const adminEmails = process.env.ADMIN_EMAILS;
  const emailApiSecret = process.env.EMAIL_API_SECRET;

  if (!token) {
    return NextResponse.json({
      step: "NO_COOKIE",
      req_cookies_token: !!token,
      next_headers_token: !!tokenFromHeaders,
      all_cookie_names: req.headers.get("cookie") ?? "(none)",
      secret_set: !!secret,
      admin_emails: adminEmails,
    });
  }

  try {
    const key = new TextEncoder().encode(secret!);
    const { payload } = await jwtVerify(token, key);
    const email = payload.email as string;
    const role = payload.role as string;
    const isAdmin = role === "admin" && esAdmin(email);

    return NextResponse.json({
      step: "JWT_OK",
      email,
      role,
      secret_set: !!secret,
      admin_emails_raw: adminEmails,
      esAdmin_result: esAdmin(email),
      role_is_admin: role === "admin",
      would_pass: isAdmin,
      email_api_secret_set: !!emailApiSecret,
    });
  } catch (e) {
    return NextResponse.json({
      step: "JWT_ERROR",
      error: String(e),
      secret_set: !!secret,
      token_length: token.length,
    });
  }
}

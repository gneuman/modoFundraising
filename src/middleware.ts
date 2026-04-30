import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

async function verificarJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

function esAdminEmail(email: unknown) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  return typeof email === "string" && admins.includes(email);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("mf_session")?.value;

  // ── /api/admin/* ──────────────────────────────────────────────────────────
  if (pathname.startsWith("/api/admin/")) {
    const auth = req.headers.get("authorization") ?? "";
    const secret = process.env.EMAIL_API_SECRET ?? "";
    if (secret && auth === `Bearer ${secret}`) return NextResponse.next();

    const payload = token ? await verificarJWT(token) : null;
    if (payload?.role === "admin" && esAdminEmail(payload.email)) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── /portal/* ─────────────────────────────────────────────────────────────
  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);
  res.headers.set("x-has-token", token ? "1" : "0");
  return res;
}

export const config = {
  matcher: ["/api/admin/:path*", "/portal/:path*"],
};

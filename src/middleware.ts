import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("mf_session")?.value;
  const pathname = req.nextUrl.pathname;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    const secret = new TextEncoder().encode(jwtSecret!);
    const { payload } = await jwtVerify(token, secret);
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    res.headers.set("x-session-email", payload.email as string);
    res.headers.set("x-session-role", payload.role as string);
    res.headers.set("x-debug-secret-len", String(jwtSecret?.length ?? 0));
    return res;
  } catch (e) {
    const jwtSecret = process.env.JWT_SECRET;
    const res = NextResponse.redirect(new URL("/auth/login", req.url));
    res.headers.set("x-debug-secret-len", String(jwtSecret?.length ?? 0));
    res.headers.set("x-debug-error", String(e).slice(0, 100));
    return res;
  }
}

export const config = {
  matcher: ["/portal/:path*"],
};

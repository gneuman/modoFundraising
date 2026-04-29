import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("mf_session")?.value;
  const pathname = req.nextUrl.pathname;

  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);

  if (!token) {
    res.headers.set("x-session-email", "");
    res.headers.set("x-session-role", "");
    return res;
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    res.headers.set("x-session-email", payload.email as string);
    res.headers.set("x-session-role", payload.role as string);
  } catch {
    res.headers.set("x-session-email", "");
    res.headers.set("x-session-role", "");
  }

  return res;
}

export const config = {
  matcher: ["/portal/:path*"],
};

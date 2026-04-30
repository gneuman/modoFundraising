import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("mf_session")?.value;
  const pathname = req.nextUrl.pathname;

  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);
  res.headers.set("x-has-token", token ? "1" : "0");
  return res;
}

export const config = {
  matcher: ["/portal/:path*"],
};

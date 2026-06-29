import { NextRequest, NextResponse } from "next/server";

// GET: muestra si hay cookie de test y la sesión real
export async function GET(req: NextRequest) {
  const test = req.cookies.get("mf_test")?.value;
  const session = req.cookies.get("mf_session")?.value;
  const allCookies = req.headers.get("cookie") ?? "(ninguna)";

  return NextResponse.json({
    mf_test: test ?? null,
    mf_session_presente: !!session,
    todas_las_cookies: allCookies,
  });
}

// POST: setea una cookie de test simple y redirige a GET
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/api/auth/cookie-test", req.url));
  res.cookies.set("mf_test", "funciona_" + Date.now(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60,
  });
  return res;
}

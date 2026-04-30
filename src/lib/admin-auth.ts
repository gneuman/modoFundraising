import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

// Acepta cookie de sesión admin O Bearer token (EMAIL_API_SECRET).
// Usa req.cookies directamente — no depende de cookies() de next/headers.
export async function verificarAdmin(req: NextRequest): Promise<NextResponse | null> {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.EMAIL_API_SECRET ?? "";
  if (secret && auth === `Bearer ${secret}`) return null;

  const token = req.cookies.get("mf_session")?.value;
  console.log("[verificarAdmin]", req.method, req.nextUrl.pathname, "| cookie:", token ? "presente" : "AUSENTE");

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
      const pass = payload.role === "admin" && typeof payload.email === "string" && admins.includes(payload.email);
      console.log("[verificarAdmin] JWT ok | role:", payload.role, "| email:", payload.email, "| pass:", pass);
      if (pass) return null;
    } catch (e) {
      console.log("[verificarAdmin] JWT error:", String(e));
    }
  }

  console.log("[verificarAdmin] → 401");
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

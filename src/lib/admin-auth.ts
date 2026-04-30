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
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
      if (payload.role === "admin" && typeof payload.email === "string" && admins.includes(payload.email)) {
        return null;
      }
    } catch {
      // JWT inválido
    }
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

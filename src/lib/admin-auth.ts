import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion, esAdmin } from "@/lib/auth";

// Acepta sesión admin (mismo check que el layout) O Bearer token (EMAIL_API_SECRET).
export async function verificarAdmin(req: NextRequest): Promise<NextResponse | null> {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.EMAIL_API_SECRET ?? "";
  if (secret && auth === `Bearer ${secret}`) return null;

  const session = await obtenerSesion();
  if (session && session.role === "admin" && esAdmin(session.email)) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

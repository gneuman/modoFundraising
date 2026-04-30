import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion, esAdmin } from "@/lib/auth";

// Acepta cookie de sesión admin O Bearer token (EMAIL_API_SECRET)
export async function verificarAdmin(req: NextRequest): Promise<NextResponse | null> {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.EMAIL_API_SECRET ?? "";

  if (secret && auth === `Bearer ${secret}`) return null; // autorizado

  const session = await obtenerSesion();
  if (session && esAdmin(session.email)) return null; // autorizado

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

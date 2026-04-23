import { NextRequest, NextResponse } from "next/server";
import { verificarTokenMagic, crearSesion, esAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login?error=invalido", req.url));
  }

  const email = await verificarTokenMagic(token);
  if (!email) {
    return NextResponse.redirect(new URL("/auth/login?error=expirado", req.url));
  }

  const rol = esAdmin(email) ? "admin" : "founder";
  await crearSesion({ email, role: rol });

  const destino = rol === "admin" ? "/admin/dashboard" : "/portal";
  return NextResponse.redirect(new URL(destino, req.url));
}

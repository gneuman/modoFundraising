import { NextRequest, NextResponse } from "next/server";
import {
  verificarTokenMagic,
  crearSesion,
  esAdmin,
  crearTokenMagic,
  decodificarEmailToken,
  TTL_MAGIC_LOGIN,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/ingresar?error=invalido", req.url));
  }

  const email = await verificarTokenMagic(token);
  if (!email) {
    // Token vencido o inválido: intentar auto-reenviar un link nuevo al mismo correo.
    // El email se lee del payload SIN validar firma — solo para saber a dónde mandar
    // un magic link legítimo; la autenticación sigue pasando por el inbox.
    const emailToken = decodificarEmailToken(token);
    if (emailToken) {
      try {
        const rol = esAdmin(emailToken) ? "admin" : "founder";
        const nuevo = await crearTokenMagic(emailToken, TTL_MAGIC_LOGIN);
        const { sendMagicLink } = await import("@/lib/email-engine");
        await sendMagicLink(emailToken, nuevo, rol);
        return NextResponse.redirect(new URL("/ingresar?reenviado=1", req.url));
      } catch {
        // Si falla el reenvío, caer al flujo normal de "expirado"
      }
    }
    return NextResponse.redirect(new URL("/ingresar?error=expirado", req.url));
  }

  const rol = esAdmin(email) ? "admin" : "founder";
  await crearSesion({ email, role: rol });

  // Registrar último ingreso al portal (solo founders, no-bloqueante)
  if (rol === "founder") {
    try {
      const { registrarIngresoPortal } = await import("@/lib/airtable");
      await registrarIngresoPortal(email);
    } catch {
      // No bloquear el login si falla el registro
    }
  }

  const destino = rol === "admin" ? "/admin/dashboard" : "/portal";
  return NextResponse.redirect(new URL(destino, req.url));
}

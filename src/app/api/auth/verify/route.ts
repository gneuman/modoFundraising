import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import {
  verificarTokenMagic,
  crearSesion,
  esAdmin,
  crearTokenMagic,
  decodificarEmailToken,
  sanitizarNext,
  TTL_MAGIC_LOGIN,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/ingresar?error=invalido", req.url));
  }

  const verificado = await verificarTokenMagic(token);
  if (!verificado) {
    // Token vencido o inválido: intentar auto-reenviar un link nuevo al mismo correo.
    // El email se lee del payload SIN validar firma — solo para saber a dónde mandar
    // un magic link legítimo; la autenticación sigue pasando por el inbox.
    const emailToken = decodificarEmailToken(token);
    if (emailToken) {
      try {
        const rol = esAdmin(emailToken) ? "admin" : "founder";
        // Preservar el destino post-login en el link reenviado si el token expirado lo traía.
        const nextExpirado = sanitizarNext(decodeJwt(token).next as string | undefined);
        const nuevo = await crearTokenMagic(emailToken, TTL_MAGIC_LOGIN, nextExpirado);
        const { sendMagicLink } = await import("@/lib/email-engine");
        await sendMagicLink(emailToken, nuevo, rol);
        return NextResponse.redirect(new URL("/ingresar?reenviado=1", req.url));
      } catch {
        // Si falla el reenvío, caer al flujo normal de "expirado"
      }
    }
    return NextResponse.redirect(new URL("/ingresar?error=expirado", req.url));
  }

  const { email, next } = verificado;
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

  // Founder con destino explícito (ej. redirigido desde /portal/misiones) va ahí.
  // Admin siempre al dashboard. Sin next, founder al home del portal.
  const destino = rol === "admin" ? "/admin/dashboard" : next ?? "/portal";
  return NextResponse.redirect(new URL(destino, req.url));
}

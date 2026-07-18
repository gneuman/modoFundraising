import { NextRequest, NextResponse } from "next/server";
import {
  verificarTokenMagic,
  crearSesion,
  esAdmin,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/ingresar?error=invalido", req.url));
  }

  const verificado = await verificarTokenMagic(token);
  if (!verificado) {
    // Token vencido o inválido: NO reenviar automáticamente desde este GET.
    //
    // Antes se auto-reenviaba un magic link nuevo aquí, pero este endpoint es un
    // GET público y los escáneres de seguridad de correo (Gmail Safe Browsing,
    // Outlook Safe Links, Proofpoint, etc.) pre-fetchean cada URL del email.
    // Cada pre-fetch de un link ya expirado disparaba otro correo, cuyo link se
    // volvía a pre-fetchear → bucle de "muchos correos". Los tokens son JWT sin
    // marca de un-solo-uso, así que no había forma de frenar el loop.
    //
    // Ahora redirigimos a /ingresar?error=expirado, que muestra "Tu enlace expiró,
    // ingresa tu correo y te enviamos uno nuevo". El reenvío pasa a ser una acción
    // EXPLÍCITA del usuario (POST /api/auth/magic desde el form) que los escáneres
    // no disparan.
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

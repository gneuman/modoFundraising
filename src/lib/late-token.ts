import { SignJWT, jwtVerify } from "jose";
import { toSantiagoDate } from "@/lib/timezone";

// ── Token del día para "misiones atrasadas" (OP-1905) ────────────────────────
//
// El equipo destraba a founders atrasados con un link firmado por el server que
// SOLO vale para el día en curso. El founder no puede fabricarlo ni descifrarlo
// (no conoce el secreto). El token cumple dos funciones:
//   1. Ventana de acceso: caduca a fin del día (zona horaria del programa).
//   2. Marca de atrasado: lo que se envíe con un token válido se guarda como
//      entrega tardía, con la fecha que el token codifica.
//
// Reutilizamos JWT_SECRET (mismo secreto de la sesión) porque es server-only y
// ya está configurado en todos los entornos.

const getSecreto = () => new TextEncoder().encode(process.env.JWT_SECRET!);

// "Hoy" en la zona del programa (America/Santiago), como "YYYY-MM-DD".
export function hoyPrograma(): string {
  return toSantiagoDate(new Date().toISOString());
}

// Firma un token para el día de hoy. Expira en 36h (holgura para husos/medianoche);
// la validación real de "es de hoy" la hace la comparación de fecha, no el exp.
export async function crearTokenDia(): Promise<string> {
  const dia = hoyPrograma();
  return new SignJWT({ dia, scope: "misiones-atrasadas" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("36h")
    .sign(getSecreto());
}

// Verifica un token. Devuelve la fecha ("YYYY-MM-DD") que codifica SOLO si:
//   - la firma es válida y no expiró, y
//   - la fecha del token es exactamente hoy (en la zona del programa).
// Si no, devuelve null (link viejo, manipulado o de otro día).
export async function verificarTokenDia(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecreto());
    if (payload.scope !== "misiones-atrasadas") return null;
    const dia = payload.dia as string | undefined;
    if (!dia || dia !== hoyPrograma()) return null;
    return dia;
  } catch {
    return null;
  }
}

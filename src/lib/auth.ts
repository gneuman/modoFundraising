import { SignJWT, jwtVerify, decodeJwt } from "jose";
import { cookies } from "next/headers";

const getSecretoSesion = () => new TextEncoder().encode(process.env.JWT_SECRET!);
const getSecretoMagic = () => new TextEncoder().encode(process.env.MAGIC_LINK_SECRET!);

export type PayloadSesion = {
  email: string;
  role: "admin" | "founder";
  recordId?: string;
};

// ── Token de magic link ──────────────────────────────────────────────────────
// TTL por defecto 15 min (login recurrente). Onboarding/invitación pasa "72h".
export const TTL_MAGIC_LOGIN = "15m";
export const TTL_MAGIC_ONBOARDING = "72h";

export async function crearTokenMagic(email: string, ttl: string = TTL_MAGIC_LOGIN) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(ttl)
    .setIssuedAt()
    .sign(getSecretoMagic());
}

export async function verificarTokenMagic(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretoMagic());
    return payload.email as string;
  } catch {
    return null;
  }
}

// Lee el email de un token (vencido o no) SIN validar la firma.
// Úsalo solo para decidir a qué correo auto-reenviar un link nuevo cuando expiró.
// No confíes en este valor para autenticar.
export function decodificarEmailToken(token: string): string | null {
  try {
    const payload = decodeJwt(token);
    const email = payload.email;
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

// ── Cookie de sesión (90 días, renovación automática) ────────────────────────
const DURACION_SESION_DIAS = 90;
const DURACION_SESION_SEGUNDOS = 60 * 60 * 24 * DURACION_SESION_DIAS;

export async function crearTokenSesion(payload: PayloadSesion): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${DURACION_SESION_DIAS}d`)
    .setIssuedAt()
    .sign(getSecretoSesion());
}

export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: DURACION_SESION_SEGUNDOS,
  path: "/",
};

export async function crearSesion(payload: PayloadSesion) {
  const token = await crearTokenSesion(payload);
  const cookies_ = await cookies();
  cookies_.set("mf_session", token, COOKIE_OPTS);
}

export async function obtenerSesion(): Promise<PayloadSesion | null> {
  const cookies_ = await cookies();
  const token = cookies_.get("mf_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretoSesion());
    const sesion: PayloadSesion = {
      email: payload.email as string,
      role: payload.role as "admin" | "founder",
      recordId: payload.recordId as string | undefined,
    };

    // Renovación deslizante: si la cookie tiene más de 1 día, renovar
    const emitidoEn = (payload.iat as number | undefined) ?? 0;
    const ahora = Math.floor(Date.now() / 1000);
    if (ahora - emitidoEn > 60 * 60 * 24) {
      try {
        await crearSesion(sesion);
      } catch {
        // No bloquear la request si falla la renovación
      }
    }

    return sesion;
  } catch {
    return null;
  }
}


export async function destruirSesion() {
  const cookies_ = await cookies();
  cookies_.delete("mf_session");
}

export function esAdmin(email: string): boolean {
  const normalizado = email.trim().toLowerCase();
  const patrones = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  for (const patron of patrones) {
    if (patron.startsWith("*@")) {
      const dominio = patron.slice(2);
      if (normalizado.endsWith(`@${dominio}`)) return true;
    } else if (patron === normalizado) {
      return true;
    }
  }
  return false;
}

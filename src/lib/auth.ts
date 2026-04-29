import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRETO_SESION = new TextEncoder().encode(process.env.JWT_SECRET!);
const SECRETO_MAGIC = new TextEncoder().encode(process.env.MAGIC_LINK_SECRET!);

export type PayloadSesion = {
  email: string;
  role: "admin" | "founder";
  recordId?: string;
};

// ── Token de magic link (15 min) ─────────────────────────────────────────────
export async function crearTokenMagic(email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .setIssuedAt()
    .sign(SECRETO_MAGIC);
}

export async function verificarTokenMagic(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRETO_MAGIC);
    return payload.email as string;
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
    .sign(SECRETO_SESION);
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
    const { payload } = await jwtVerify(token, SECRETO_SESION);
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
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  return admins.includes(email);
}

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

// ── Cookie de sesión (7 días) ─────────────────────────────────────────────────
export async function crearSesion(payload: PayloadSesion) {
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRETO_SESION);

  const cookies_ = await cookies();
  cookies_.set("mf_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function obtenerSesion(): Promise<PayloadSesion | null> {
  const cookies_ = await cookies();
  const token = cookies_.get("mf_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRETO_SESION);
    return payload as unknown as PayloadSesion;
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

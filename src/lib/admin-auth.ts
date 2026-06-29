import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { esAdmin } from "@/lib/auth";

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export async function verificarAdmin(req: NextRequest): Promise<NextResponse | null> {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.EMAIL_API_SECRET ?? "";
  if (secret && auth === `Bearer ${secret}`) return null;

  const token = req.cookies.get("mf_session")?.value;
  if (!token) {
    console.log("[verificarAdmin] no mf_session cookie. cookies:", req.cookies.getAll().map(c => c.name));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role === "admin" && esAdmin(payload.email as string)) return null;
    console.log("[verificarAdmin] JWT válido pero no es admin:", payload.email, payload.role);
  } catch (e) {
    console.log("[verificarAdmin] JWT inválido:", e);
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

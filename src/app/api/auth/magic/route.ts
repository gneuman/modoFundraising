import { NextRequest, NextResponse } from "next/server";
import { crearTokenMagic, esAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const rol = esAdmin(email) ? "admin" : "founder";
  const token = await crearTokenMagic(email);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const enlace = `${base}/api/auth/verify?token=${token}&role=${rol}`;

  // Sin proveedor de email: devolver el enlace directo para acceso inmediato
  if (!process.env.RESEND_API_KEY) {
    console.log(`[auth] Enlace de acceso para ${email}: ${enlace}`);
    return NextResponse.json({ success: true, enlace });
  }

  // Con Resend configurado: mandar email y no exponer el enlace
  const { sendMagicLink } = await import("@/lib/resend");
  await sendMagicLink(email, token, rol);
  return NextResponse.json({ success: true });
}

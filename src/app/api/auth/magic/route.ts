import { NextRequest, NextResponse } from "next/server";
import { crearTokenMagic, esAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const rol = esAdmin(email) ? "admin" : "founder";
  const token = await crearTokenMagic(email);
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).replace(/\/$/, "");
  const enlace = `${base}/api/auth/verify?token=${token}&role=${rol}`;

  const { sendMagicLink } = await import("@/lib/gmail");
  await sendMagicLink(email, token, rol);
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { crearSesion, esAdmin } from "@/lib/auth";
import { getFounderByEmail } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();

  if (esAdmin(normalized)) {
    await crearSesion({ email: normalized, role: "admin" });
    return NextResponse.json({ ok: true, redirect: "/admin/dashboard" });
  }

  const founder = await getFounderByEmail(normalized);
  if (!founder) {
    return NextResponse.json({ error: "No encontramos una cuenta con ese email. ¿Ya postulaste?" }, { status: 404 });
  }

  await crearSesion({ email: normalized, role: "founder" });
  return NextResponse.json({ ok: true, redirect: "/portal" });
}

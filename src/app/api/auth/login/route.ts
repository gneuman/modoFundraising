import { NextRequest, NextResponse } from "next/server";
import { crearSesion, esAdmin } from "@/lib/auth";
import { getFounderByEmail } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email } = body;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();

  if (esAdmin(normalized)) {
    await crearSesion({ email: normalized, role: "admin" });
    return NextResponse.redirect(new URL("/admin/dashboard", req.url), { status: 303 });
  }

  const founder = await getFounderByEmail(normalized);
  if (!founder) {
    return NextResponse.json({ error: "No encontramos una cuenta con ese email. ¿Ya postulaste?" }, { status: 404 });
  }

  await crearSesion({ email: normalized, role: "founder" });
  return NextResponse.redirect(new URL("/portal", req.url), { status: 303 });
}

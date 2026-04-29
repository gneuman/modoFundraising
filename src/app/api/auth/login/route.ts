import { NextRequest, NextResponse } from "next/server";
import { crearTokenSesion, COOKIE_OPTS, esAdmin } from "@/lib/auth";
import { getFounderByEmail } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email } = body;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();

  if (esAdmin(normalized)) {
    const token = await crearTokenSesion({ email: normalized, role: "admin" });
    const res = NextResponse.redirect(new URL("/admin/dashboard", req.url), { status: 303 });
    res.cookies.set("mf_session", token, COOKIE_OPTS);
    return res;
  }

  const founder = await getFounderByEmail(normalized);
  if (!founder) {
    return NextResponse.json({ error: "No encontramos una cuenta con ese email. ¿Ya postulaste?" }, { status: 404 });
  }

  const token = await crearTokenSesion({ email: normalized, role: "founder" });
  const res = NextResponse.redirect(new URL("/portal", req.url), { status: 303 });
  res.cookies.set("mf_session", token, COOKIE_OPTS);
  return res;
}

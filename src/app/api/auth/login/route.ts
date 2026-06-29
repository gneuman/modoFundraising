import { NextRequest, NextResponse } from "next/server";
import { crearTokenSesion, COOKIE_OPTS, esAdmin } from "@/lib/auth";
import { getFounderByEmail } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email } = body;
  console.log("[login] body recibido:", body);

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();
  console.log("[login] email normalizado:", normalized, "| esAdmin:", esAdmin(normalized));

  if (esAdmin(normalized)) {
    const token = await crearTokenSesion({ email: normalized, role: "admin" });
    console.log("[login] token creado, seteando cookie mf_session");
    const res = NextResponse.json({ ok: true, redirect: "/admin/dashboard" });
    res.cookies.set("mf_session", token, COOKIE_OPTS);
    console.log("[login] cookie seteada en response, headers:", res.headers.get("set-cookie"));
    return res;
  }

  const founder = await getFounderByEmail(normalized);
  if (!founder) {
    return NextResponse.json({ error: "No encontramos una cuenta con ese email. ¿Ya postulaste?" }, { status: 404 });
  }

  const token = await crearTokenSesion({ email: normalized, role: "founder" });
  const res = NextResponse.json({ ok: true, redirect: "/portal" });
  res.cookies.set("mf_session", token, COOKIE_OPTS);
  return res;
}

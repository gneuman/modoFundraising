import { NextRequest, NextResponse } from "next/server";
import { crearTokenSesion, COOKIE_OPTS, esAdmin } from "@/lib/auth";
import { getFounderByEmail } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let email: string | undefined;
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    email = body.email;
  } else {
    const form = await req.formData().catch(() => new FormData());
    email = form.get("email")?.toString();
  }
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
    return NextResponse.redirect(new URL("/auth/login?error=not_found", req.url), { status: 303 });
  }

  const token = await crearTokenSesion({ email: normalized, role: "founder" });
  const res = NextResponse.redirect(new URL("/api/auth/debug", req.url), { status: 303 });
  res.cookies.set("mf_session", token, COOKIE_OPTS);
  return res;
}

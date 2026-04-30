import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { crearSesion, esAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email =
      (session.metadata?.email as string | undefined) ??
      (session.customer_details?.email as string | undefined);

    if (!email) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    await crearSesion({ email, role: esAdmin(email) ? "admin" : "founder" });
    return NextResponse.redirect(new URL("/portal", req.url));
  } catch {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
}

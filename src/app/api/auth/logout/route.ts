import { NextResponse } from "next/server";
import { destruirSesion } from "@/lib/auth";

export async function GET() {
  await destruirSesion();
  return NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL!));
}

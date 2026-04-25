import { NextRequest, NextResponse } from "next/server";
import { destruirSesion } from "@/lib/auth";

async function handle(req: NextRequest) {
  await destruirSesion();
  return NextResponse.redirect(new URL("/auth/login", req.url));
}

export const GET = handle;
export const POST = handle;

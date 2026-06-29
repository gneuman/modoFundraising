export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getLandingTextos, setLandingTextos } from "@/lib/airtable";

export async function GET(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  return NextResponse.json(await getLandingTextos());
}

export async function PUT(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const body = await req.json();
  await setLandingTextos(body);
  return NextResponse.json({ ok: true });
}

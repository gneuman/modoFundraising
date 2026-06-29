export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getInstructores, setInstructores } from "@/lib/airtable";

export async function GET(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  return NextResponse.json(await getInstructores());
}

export async function PUT(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const instructores = await req.json();
  await setInstructores(instructores);
  return NextResponse.json({ ok: true });
}

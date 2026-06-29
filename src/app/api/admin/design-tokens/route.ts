export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getDesignTokens, updateDesignTokens } from "@/lib/airtable";

export async function GET(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const tokens = await getDesignTokens();
  return NextResponse.json(tokens);
}

export async function PUT(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  await updateDesignTokens(id, fields);
  return NextResponse.json({ ok: true });
}

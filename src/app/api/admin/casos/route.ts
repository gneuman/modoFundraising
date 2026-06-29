export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getHomeCasosExitoAll, updateHomeCasoExito } from "@/lib/airtable";

export async function GET(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  return NextResponse.json(await getHomeCasosExitoAll());
}

export async function PUT(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const casos = await req.json();
  await Promise.all(casos.map((c: { id: string; [key: string]: unknown }) => {
    const { id, ...fields } = c;
    return updateHomeCasoExito(id, fields);
  }));
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { verificarAdmin } from "@/lib/admin-auth";
import { createRecurso, updateRecurso } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const body = await req.json();
  const id = await createRecurso(body);
  revalidateTag("clases-content", { expire: 0 });
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const { id, ...data } = await req.json();
  await updateRecurso(id, data);
  revalidateTag("clases-content", { expire: 0 });
  return NextResponse.json({ success: true });
}

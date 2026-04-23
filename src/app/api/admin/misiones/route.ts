import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { createMision, updateMision } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = await createMision(body);
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...data } = await req.json();
  await updateMision(id, data);
  return NextResponse.json({ success: true });
}

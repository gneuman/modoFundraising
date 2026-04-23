import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { createRecurso, updateRecurso } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = await createRecurso(body);
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...data } = await req.json();
  await updateRecurso(id, data);
  return NextResponse.json({ success: true });
}

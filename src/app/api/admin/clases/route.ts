import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { getClasesWithContent, createClase, updateClase } from "@/lib/airtable";

export async function GET() {
  const session = await obtenerSesion();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clases = await getClasesWithContent();
  return NextResponse.json(clases);
}

export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = await createClase(body);
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...data } = await req.json();
  await updateClase(id, data);
  return NextResponse.json({ success: true });
}

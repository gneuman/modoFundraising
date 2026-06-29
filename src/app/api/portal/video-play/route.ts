import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { getAllApplications, logVideoPlay } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || session.role !== "founder") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { claseId } = await req.json();
  if (!claseId) {
    return NextResponse.json({ error: "claseId requerido" }, { status: 400 });
  }

  const apps = await getAllApplications();
  const app = apps.find(
    (a) =>
      a.email === session.email &&
      (a.status === "Inscrita" || a.status === "Invitada institucional")
  );
  const startupId = app?.startup_record?.[0] as string | undefined;

  if (!startupId) {
    return NextResponse.json({ error: "Startup no encontrada" }, { status: 404 });
  }

  await logVideoPlay(startupId, claseId);
  return NextResponse.json({ ok: true });
}

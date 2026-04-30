import { NextRequest, NextResponse } from "next/server";
import { getMeetRecordings, makeFilePublic } from "@/lib/drive";

export async function GET(req: NextRequest) {


  const since = req.nextUrl.searchParams.get("since") ?? undefined;

  try {
    const recordings = await getMeetRecordings(since);
    return NextResponse.json({ recordings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al conectar con Drive";
    // Scope insuficiente → necesita re-autorizar
    if (message.includes("insufficient") || message.includes("scope") || message.includes("403")) {
      return NextResponse.json({ error: "drive_scope_missing" }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Hace pública una grabación y devuelve la embed URL
export async function POST(req: NextRequest) {


  const { fileId } = await req.json();
  if (!fileId) return NextResponse.json({ error: "fileId requerido" }, { status: 400 });

  try {
    await makeFilePublic(fileId);
    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    const shareUrl = `https://drive.google.com/file/d/${fileId}/view`;
    return NextResponse.json({ embedUrl, shareUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

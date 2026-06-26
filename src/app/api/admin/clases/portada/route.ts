export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { verificarAdmin } from "@/lib/admin-auth";

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TOKEN = (process.env.AIRTABLE_TOKEN ?? process.env.AIRTABLE_PAT)!;

// Sube un archivo de portada para una Clase a Airtable
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const claseId = formData.get("claseId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!claseId) {
      return NextResponse.json({ error: "No claseId provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const url = `https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${claseId}/Portada/uploadAttachment`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: file.type,
        filename: file.name,
        file: base64,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Airtable portada upload error:", err);
      return NextResponse.json({ error: "Airtable upload failed", detail: err }, { status: 500 });
    }

    const data = await res.json();
    const attachmentUrl = data?.attachment?.url ?? data?.url ?? "";
    const thumbnails = data?.attachment?.thumbnails ?? data?.thumbnails;

    revalidateTag("clases-content", { expire: 0 });
    return NextResponse.json({ url: attachmentUrl, thumbnails });
  } catch (err) {
    console.error("Portada upload error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

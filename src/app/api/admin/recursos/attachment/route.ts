export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { verificarAdmin } from "@/lib/admin-auth";

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TOKEN = (process.env.AIRTABLE_TOKEN ?? process.env.AIRTABLE_PAT)!;

// Sube un archivo al campo Attachments de un Recurso ya creado.
// Patrón Airtable: primero se crea el record (POST /api/admin/recursos),
// después se sube el binario aquí vía la Content API.
export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const recursoId = formData.get("recursoId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!recursoId) {
      return NextResponse.json({ error: "No recursoId provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const url = `https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${recursoId}/Attachments/uploadAttachment`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: file.type || "application/octet-stream",
        filename: file.name,
        file: base64,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Airtable recurso attachment upload error:", err);
      return NextResponse.json({ error: "Airtable upload failed", detail: err }, { status: 502 });
    }

    const data = await res.json();
    // La Content API devuelve el record con el field ID (no el nombre):
    // { id, fields: { fldXXX: [...attachments] } }. Tomamos el primer field.
    const attachments = (Object.values(data?.fields ?? {})[0] ?? []) as Array<{
      url: string;
      filename: string;
    }>;
    const uploaded = attachments.find((a) => a.filename === file.name) ?? attachments[0];

    revalidateTag("clases-content", { expire: 0 });
    return NextResponse.json({
      url: uploaded?.url ?? "",
      filename: uploaded?.filename ?? file.name,
    });
  } catch (err) {
    console.error("Recurso attachment upload error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

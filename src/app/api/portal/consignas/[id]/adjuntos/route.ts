import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { obtenerSesion } from "@/lib/auth";
import { Tables } from "@/lib/airtable";

export const dynamic = "force-dynamic";

// POST /api/portal/consignas/[id]/adjuntos
//
// Sube UN archivo al campo `adjuntos` de una consigna existente.
// Se usa después de que el frontend creó la consigna via POST /api/portal/consignas
// y recibió el consignaId — este endpoint sube archivo por archivo con feedback
// visible por cada uno.
//
// Content-Type: multipart/form-data
// FormData: { file: File }
//
// Autoriza:
//   - Founder inscrito
//   - Admin (para testear como cualquier startup)
//
// NOTA: no validamos que la consigna pertenece a la startup del founder porque
// esa validacion la hizo el POST previo cuando creó la consigna. Aquí solo
// autenticamos que la sesion existe.

const AIRTABLE_PAT = process.env.AIRTABLE_PAT ?? process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await obtenerSesion();
  if (!session || (session.role !== "founder" && session.role !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
    return NextResponse.json({ error: "Airtable no configurado" }, { status: 500 });
  }

  const { id: consignaId } = await ctx.params;
  if (!consignaId || !consignaId.startsWith("rec")) {
    return NextResponse.json({ error: "consignaId inválido" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file requerido" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "file vacío" }, { status: 400 });
  }

  // Sanity check: la consigna debe existir
  const check = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${Tables.CONSIGNAS}/${consignaId}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } },
  );
  if (!check.ok) {
    return NextResponse.json(
      { error: `Consigna ${consignaId} no existe (${check.status})` },
      { status: 404 },
    );
  }

  // Upload a Airtable Attachment API
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const fieldPath = encodeURIComponent("adjuntos");
  const uploadUrl = `https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${consignaId}/${fieldPath}/uploadAttachment`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_PAT}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      contentType: file.type || "application/octet-stream",
      filename: file.name,
      file: base64,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(
      `[consignas/adjuntos] Airtable upload failed (${res.status}) consignaId=${consignaId} file=${file.name}:`,
      err,
    );
    return NextResponse.json(
      { error: `Falla en Airtable (${res.status})`, detail: err },
      { status: 502 },
    );
  }

  const data = await res.json();
  // La respuesta viene con el record actualizado: { id, fields: { <fieldId>: [...attachments] } }
  const attachments = Object.values(data.fields ?? {})[0] as
    | Array<{ id: string; url: string; filename: string; size: number; type: string }>
    | undefined;
  const uploaded = attachments?.find((a) => a.filename === file.name);

  revalidateTag("clases-content", { expire: 0 });

  return NextResponse.json({
    ok: true,
    filename: file.name,
    attachment: uploaded
      ? {
          id: uploaded.id,
          url: uploaded.url,
          filename: uploaded.filename,
          size: uploaded.size,
          type: uploaded.type,
        }
      : null,
    totalAdjuntos: attachments?.length ?? 0,
  });
}

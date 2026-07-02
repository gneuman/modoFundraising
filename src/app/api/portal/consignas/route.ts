import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { obtenerSesion } from "@/lib/auth";
import {
  getAllApplications,
  upsertConsigna,
  recomputeMisionCompletada,
  getTareaByIdFresh,
} from "@/lib/airtable";

export const dynamic = "force-dynamic";

// POST /api/portal/consignas
//
// Guarda la respuesta de un founder a una tarea tipo Entrega.
// Upsert por (startup, tarea): si ya existe, la actualiza; si no, la crea.
//
// Content-Type: multipart/form-data
// FormData fields:
//   - tareaId (string, requerido)
//   - contenido_texto (string, opcional)
//   - url_extra (string, opcional)
//   - files[] (File[], opcional) — se suben a Airtable Attachment
//
// startupId y founderEmail se derivan de la sesión — nunca del body.
//
// Después del upsert se llama recomputeMisionCompletada para recalcular si
// la misión ya quedó completa por esta startup.

const AIRTABLE_PAT = process.env.AIRTABLE_PAT ?? process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

async function uploadFileToAirtable(
  recordId: string,
  file: File,
): Promise<{ url: string; filename: string } | null> {
  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) return null;
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const url = `https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/adjuntos/uploadAttachment`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_PAT}`,
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
    console.error("[consignas/upload] Airtable upload failed:", err);
    return null;
  }
  const data = await res.json();
  return {
    url: data?.attachment?.url ?? data?.url ?? "",
    filename: file.name,
  };
}

export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || session.role !== "founder") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Aceptamos tanto JSON como multipart/form-data para flexibilidad.
  // El form real usa FormData porque puede incluir archivos.
  const contentType = req.headers.get("content-type") ?? "";
  let tareaId = "";
  let contenido = "";
  let url_extra = "";
  let files: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    tareaId = String(form.get("tareaId") ?? "").trim();
    contenido = String(form.get("contenido_texto") ?? "").trim();
    url_extra = String(form.get("url_extra") ?? "").trim();
    files = form.getAll("files").filter((v): v is File => v instanceof File);
  } else {
    // Fallback JSON — sin archivos
    try {
      const body = (await req.json()) as {
        tareaId?: string;
        contenido_texto?: string;
        url_extra?: string;
      };
      tareaId = (body.tareaId ?? "").trim();
      contenido = (body.contenido_texto ?? "").trim();
      url_extra = (body.url_extra ?? "").trim();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
  }

  if (!tareaId) {
    return NextResponse.json({ error: "tareaId requerido" }, { status: 400 });
  }
  if (!contenido && !url_extra && files.length === 0) {
    return NextResponse.json(
      { error: "Debe incluir al menos texto, URL o adjuntos" },
      { status: 400 },
    );
  }

  // Derivar startupId de la sesión
  const apps = await getAllApplications();
  const app = apps.find(
    (a) =>
      a.email === session.email &&
      (a.status === "Inscrita" || a.status === "Invitada institucional"),
  );
  const startupId = app?.startup_record?.[0] as string | undefined;
  if (!startupId) {
    return NextResponse.json({ error: "Startup no encontrada" }, { status: 403 });
  }

  // Validar que la tarea existe, es tipo Entrega y sabemos su misión
  const tarea = await getTareaByIdFresh(tareaId);
  if (!tarea) {
    return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
  }
  if (tarea.tipo !== "Entrega") {
    return NextResponse.json(
      { error: `Solo se pueden guardar consignas para tareas tipo Entrega (esta es "${tarea.tipo}")` },
      { status: 400 },
    );
  }
  const misionId = tarea.mision?.[0];
  if (!misionId) {
    return NextResponse.json(
      { error: "La tarea no está asociada a una misión" },
      { status: 400 },
    );
  }

  // 1. Upsert la consigna primero (sin nuevos adjuntos). Esto nos da el
  //    recordId que necesitamos para subir archivos a Airtable Attachment.
  const { id: consignaId, created } = await upsertConsigna({
    startupId,
    tareaId,
    contenido_texto: contenido,
    url_extra,
    founderEmail: session.email,
  });

  // 2. Si hay archivos nuevos, subirlos uno a uno al campo "adjuntos" del record.
  //    Airtable Attachment API append por defecto — no reemplaza los ya subidos.
  const uploadResults: Array<{ filename: string; ok: boolean }> = [];
  for (const file of files) {
    const attach = await uploadFileToAirtable(consignaId, file);
    uploadResults.push({ filename: file.name, ok: !!attach });
  }
  const uploadsFailed = uploadResults.filter((r) => !r.ok);

  // 3. Recalcular estado de la misión (por-startup)
  const completeness = await recomputeMisionCompletada(startupId, misionId);

  // 4. Refrescar el portal
  revalidateTag("clases-content", { expire: 0 });

  return NextResponse.json({
    ok: uploadsFailed.length === 0,
    consignaId,
    created,
    uploads: {
      total: files.length,
      ok: uploadResults.filter((r) => r.ok).length,
      failed: uploadsFailed,
    },
    mision: {
      completada: completeness.completada,
      total: completeness.total,
      hechas: completeness.hechas,
    },
  });
}

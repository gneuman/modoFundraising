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
  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
    console.error("[consignas/upload] AIRTABLE_PAT o AIRTABLE_BASE_ID no configurados");
    return null;
  }
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  // encodeURIComponent del nombre del field — patrón carshi. Si el field tiene
  // caracteres especiales (espacios, emojis, etc.) sin encodear rompe la URL.
  const fieldPath = encodeURIComponent("adjuntos");
  const url = `https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/${fieldPath}/uploadAttachment`;
  const res = await fetch(url, {
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
      `[consignas/upload] Airtable upload failed (${res.status}) for recordId=${recordId}, file=${file.name}:`,
      err,
    );
    return null;
  }
  const data = await res.json();
  const attachmentUrl = data?.attachment?.url ?? data?.url ?? "";
  if (!attachmentUrl) {
    console.error(
      `[consignas/upload] Airtable respondio 200 pero sin URL para ${file.name}. Response:`,
      JSON.stringify(data),
    );
    return null;
  }
  return { url: attachmentUrl, filename: file.name };
}

export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  // Admins tambien pueden llamar el endpoint (para testear como cualquier
  // startup). Founders solo pueden llamar como si mismos.
  if (!session || (session.role !== "founder" && session.role !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Aceptamos tanto JSON como multipart/form-data para flexibilidad.
  // El form real usa FormData porque puede incluir archivos.
  const contentType = req.headers.get("content-type") ?? "";
  let tareaId = "";
  let contenido = "";
  let url_extra = "";
  let files: File[] = [];
  let adminStartupId: string | undefined; // solo valido si session.role === "admin"

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    tareaId = String(form.get("tareaId") ?? "").trim();
    contenido = String(form.get("contenido_texto") ?? "").trim();
    url_extra = String(form.get("url_extra") ?? "").trim();
    files = form.getAll("files").filter((v): v is File => v instanceof File);
    adminStartupId = String(form.get("startupId") ?? "").trim() || undefined;
  } else {
    // Fallback JSON — sin archivos
    try {
      const body = (await req.json()) as {
        tareaId?: string;
        contenido_texto?: string;
        url_extra?: string;
        startupId?: string;
      };
      tareaId = (body.tareaId ?? "").trim();
      contenido = (body.contenido_texto ?? "").trim();
      url_extra = (body.url_extra ?? "").trim();
      adminStartupId = body.startupId?.trim() || undefined;
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

  // Derivar startupId:
  //   - Admin: acepta startupId del body para poder testear como cualquier startup
  //   - Founder: siempre de la sesion (nunca del body)
  let startupId: string | undefined;
  let founderEmail: string;
  if (session.role === "admin" && adminStartupId) {
    startupId = adminStartupId;
    founderEmail = `admin:${session.email}`; // audit trail
  } else {
    const apps = await getAllApplications();
    const emailLower = session.email.toLowerCase();
    const app = apps.find((a) => {
      const isEnrolled = a.status === "Inscrita" || a.status === "Invitada institucional";
      if (!isEnrolled) return false;
      // Chequea principal + todos los cofounders (case-insensitive)
      const allEmails = [a.email, ...(a.all_founder_emails ?? [])]
        .filter(Boolean)
        .map((e) => e!.toLowerCase());
      return allEmails.includes(emailLower);
    });
    startupId = app?.startup_record?.[0] as string | undefined;
    founderEmail = session.email;
    if (!startupId) {
      return NextResponse.json(
        {
          error:
            session.role === "admin"
              ? "Como admin, debes pasar `startupId` en el body para testear (tu email no tiene startup asignada)."
              : "Tu usuario no esta inscrito como founder de una startup activa. Contacta al equipo de Modo Fundraising.",
        },
        { status: 403 },
      );
    }
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
    founderEmail,
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

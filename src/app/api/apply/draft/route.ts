import { NextRequest, NextResponse } from "next/server";
import {
  createFounderRecord,
  createStartupRecord,
  updateFounder,
  updateStartup,
  getFounderByEmail,
  getStartupByFounderId,
  getPostulacionByFounderId,
  createDraftPostulacion,
  updateDraftPostulacion,
} from "@/lib/airtable";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, formData } = body as { email: string; formData: Record<string, unknown> };

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    let founderRecordId: string = (formData._founder_record_id as string) || "";
    let startupRecordId: string = (formData._startup_record_id as string) || "";
    let postulacionRecordId: string = (formData._postulacion_record_id as string) || "";

    // ── Founder ──────────────────────────────────────────────────────────────
    if (!founderRecordId) {
      const existing = await getFounderByEmail(email);
      founderRecordId = existing?.id ?? await createFounderRecord(formData as never);
    } else {
      await updateFounder(founderRecordId, formData as never);
    }

    // ── Postulación (sin status — vacío hasta submit) ─────────────────────
    if (!postulacionRecordId) {
      const existing = await getPostulacionByFounderId(founderRecordId);
      postulacionRecordId = existing ?? await createDraftPostulacion(founderRecordId);
    } else {
      await updateDraftPostulacion(postulacionRecordId, formData, { founderRecordId, startupRecordId: startupRecordId || undefined });
    }

    // ── Startup ───────────────────────────────────────────────────────────
    if (formData.startup_name) {
      if (!startupRecordId) {
        const existing = await getStartupByFounderId(founderRecordId);
        startupRecordId = existing ?? await createStartupRecord(formData as never, founderRecordId);
        // link startup to postulacion
        await updateDraftPostulacion(postulacionRecordId, formData, { founderRecordId, startupRecordId });
      } else {
        await updateStartup(startupRecordId, formData as never);
      }
    }

    return NextResponse.json({
      ok: true,
      v: "2.0",
      founderRecordId,
      startupRecordId: startupRecordId || null,
      postulacionRecordId,
    });
  } catch (err) {
    console.error("Draft error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

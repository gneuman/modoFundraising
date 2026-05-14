import { NextRequest, NextResponse } from "next/server";
import {
  getDraftByEmail,
  upsertDraftApplication,
  createFounderRecord,
  createStartupRecord,
  updateFounder,
  updateStartup,
  getFounderByEmail,
  getStartupByFounderId,
} from "@/lib/airtable";
import type { ApplicationFormData } from "@/lib/form-schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, formData } = body as { email: string; formData: Record<string, unknown> };

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const draft = await getDraftByEmail(email);
    let { founderRecordId, startupRecordId } = draft ?? { founderRecordId: null, startupRecordId: null };

    console.log("[draft] email:", email, "| founderRecordId:", founderRecordId, "| startupRecordId:", startupRecordId);

    // Create Founder record as soon as we have the email (guard against duplicates)
    if (!founderRecordId) {
      const existing = await getFounderByEmail(email);
      if (existing?.id) {
        founderRecordId = existing.id;
        await updateFounder(founderRecordId, formData as never);
      } else {
        founderRecordId = await createFounderRecord(formData as never);
      }
      console.log("[draft] founder resolved:", founderRecordId);
    } else {
      await updateFounder(founderRecordId, formData as never);
    }

    // Create Startup record as soon as we have the startup_name (guard against duplicates)
    if (formData.startup_name) {
      if (!startupRecordId) {
        const existingStartup = await getStartupByFounderId(founderRecordId);
        if (existingStartup) {
          startupRecordId = existingStartup;
          console.log("[draft] startup found by founder:", startupRecordId);
        } else {
          startupRecordId = await createStartupRecord(formData as never, founderRecordId);
          console.log("[draft] startup created:", startupRecordId);
        }
      }
      await updateStartup(startupRecordId, formData as never);
    }

    console.log("[draft] saving postulacion links — founder:", founderRecordId, "| startup:", startupRecordId);

    await upsertDraftApplication(
      email,
      formData,
      {
        founderRecordId: founderRecordId ?? undefined,
        startupRecordId: startupRecordId ?? undefined,
      },
      draft
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Draft error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

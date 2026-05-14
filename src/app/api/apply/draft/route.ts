import { NextRequest, NextResponse } from "next/server";
import {
  getDraftByEmail,
  upsertDraftApplication,
  createFounderRecord,
  createStartupRecord,
  updateFounder,
  updateStartup,
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

    // Create Founder record as soon as we have the email
    if (!founderRecordId) {
      founderRecordId = await createFounderRecord(formData as never);
    } else {
      // Update Founder with any new fields that arrived
      await updateFounder(founderRecordId, formData as never);
    }

    // Create Startup record as soon as we have the startup_name
    if (formData.startup_name && !startupRecordId) {
      startupRecordId = await createStartupRecord(formData as never, founderRecordId);
    } else if (startupRecordId) {
      await updateStartup(startupRecordId, formData as never);
    }

    await upsertDraftApplication(email, formData, {
      founderRecordId: founderRecordId ?? undefined,
      startupRecordId: startupRecordId ?? undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Draft error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

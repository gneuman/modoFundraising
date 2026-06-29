import { NextResponse } from "next/server";
import Airtable from "airtable";
import { Tables } from "@/lib/airtable";

function base(table: string) {
  return new Airtable({ apiKey: process.env.AIRTABLE_PAT })
    .base(process.env.AIRTABLE_BASE_ID!)(table);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const record = await base(Tables.POSTULACIONES).find(id);
    const fields = record.fields as Record<string, unknown>;

    let formData: Record<string, unknown> = {};
    if (typeof fields.form_responses === "string") {
      try {
        formData = JSON.parse(fields.form_responses);
      } catch {
        // ignore parse error
      }
    }

    // Inyectar los IDs para que el form sepa que continúa un draft existente
    const founderRecordId = (fields.founder_record as string[])?.[0];
    const startupRecordId = (fields.startup_record as string[])?.[0];
    if (founderRecordId) formData._founder_record_id = founderRecordId;
    if (startupRecordId) formData._startup_record_id = startupRecordId;
    formData._postulacion_record_id = record.id;

    return NextResponse.json({ formData, postulacionId: record.id });
  } catch (err) {
    console.error("[/api/apply/load] error:", err);
    return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });
  }
}

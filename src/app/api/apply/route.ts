import { NextRequest, NextResponse } from "next/server";
import { createApplication, getApplicationByEmail } from "@/lib/airtable";
import { sendApplicationConfirmation } from "@/lib/email-engine";
import { sendReferralRequest } from "@/lib/email-engine";
import { applicationSchema } from "@/lib/form-schema";
import { normalizarEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await req.json();

    const parsed = applicationSchema.safeParse(body);
    if (!parsed.success) {
      console.warn("[/api/apply] validation failed:", JSON.stringify(parsed.error.flatten()));
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = { ...parsed.data, email: normalizarEmail(parsed.data.email) };
    const hasPostulacionId = Boolean(body._postulacion_record_id);

    // Saltarse el check de duplicados si ya tenemos un draft postulacion
    // (significa que el usuario ya pasó por el flujo y no es un duplicado)
    if (!hasPostulacionId) {
      const existing = await getApplicationByEmail(data.email);
      if (existing) {
        return NextResponse.json(
          { error: "Email ya registrado", code: "DUPLICATE_EMAIL" },
          { status: 409 }
        );
      }
    }

    // Creates Postulacion — reuses Founder + Startup if already created during draft
    const result = await createApplication(
      { ...data, linkedin_founder: data.linkedin_founder ?? "", startup_linkedin: data.startup_linkedin ?? "", round_series: data.round_series ?? "", round_size: data.round_size ?? 0, round_tickets: data.round_tickets ?? [], startup_logo_url: body.startup_logo_url ?? "", accept_legal_terms: true },
      {
        founderRecordId: body._founder_record_id as string | undefined,
        startupRecordId: body._startup_record_id as string | undefined,
        postulacionRecordId: body._postulacion_record_id as string | undefined,
      }
    );

    // Fire-and-forget emails
    sendApplicationConfirmation(data.email, data.first_name).catch(console.error);

    if (data.has_referrals === "Sí") {
      const founderName = `${data.first_name} ${data.last_name}`;
      for (let i = 1; i <= 3; i++) {
        const email = (data as Record<string, unknown>)[`referral_${i}_email`] as string;
        const name = (data as Record<string, unknown>)[`referral_${i}_name`] as string;
        if (email && name) {
          sendReferralRequest(email, name, founderName, data.startup_name).catch(console.error);
        }
      }
    }

    console.log(`[/api/apply] OK in ${Date.now() - t0}ms — postulacion=${result.postulacionId}`);
    return NextResponse.json({ success: true, postulacionId: result.postulacionId });
  } catch (err) {
    console.error(`[/api/apply] error after ${Date.now() - t0}ms:`, err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

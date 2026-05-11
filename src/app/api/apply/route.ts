import { NextRequest, NextResponse } from "next/server";
import { createApplication, getApplicationByEmail } from "@/lib/airtable";
import { sendApplicationConfirmation, sendReferralRequest } from "@/lib/resend";
import { applicationSchema } from "@/lib/form-schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = applicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check duplicate email in Founders table
    const existing = await getApplicationByEmail(data.email);
    if (existing) {
      return NextResponse.json(
        { error: "Email ya registrado", code: "DUPLICATE_EMAIL" },
        { status: 409 }
      );
    }

    // Creates Founder + Startup + Postulacion records
    await createApplication({
      ...data,
      startup_logo_url: body.startup_logo_url ?? "",
      accept_legal_terms: true,
    });

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Apply error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

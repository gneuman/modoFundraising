import { NextRequest, NextResponse } from "next/server";
import { upsertDraftApplication } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, formData } = body as { email: string; formData: Record<string, unknown> };

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    await upsertDraftApplication(email, formData);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Draft error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

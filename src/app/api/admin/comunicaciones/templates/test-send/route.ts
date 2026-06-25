import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getEmailTemplates } from "@/lib/airtable";
import { sendTestTemplateEmail } from "@/lib/email-engine";

export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  let body: { id?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, email } = body;
  if (!id || !email) {
    return NextResponse.json({ error: "Falta id o email" }, { status: 400 });
  }

  const templates = await getEmailTemplates();
  const template = templates.find((t) => t.id === id);
  if (!template) {
    return NextResponse.json({ error: "Template no encontrado" }, { status: 404 });
  }

  try {
    await sendTestTemplateEmail(
      { subject: template.subject, body_html: template.body_html },
      email,
    );
    return NextResponse.json({ ok: true, to: email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[test-send] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

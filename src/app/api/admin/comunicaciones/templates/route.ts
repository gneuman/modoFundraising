import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import { getEmailTemplates, updateEmailTemplate, upsertEmailTemplate } from "@/lib/airtable";

export async function GET(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const templates = await getEmailTemplates();
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const body = await req.json();
  const { id, ...data } = body;

  if (id) {
    await updateEmailTemplate(id, data);
    return NextResponse.json({ ok: true });
  }

  if (!data.name || !data.label || !data.subject || !data.body_html) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const newId = await upsertEmailTemplate({ active: true, ...data });
  return NextResponse.json({ id: newId });
}

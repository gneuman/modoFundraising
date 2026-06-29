import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import {
  getAutomationRules,
  updateAutomationRule,
  upsertAutomationRule,
  deleteAutomationRule,
} from "@/lib/airtable";

export async function GET(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;
  const rules = await getAutomationRules();
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const body = await req.json();
  const { id, template, ...data } = body;
  void template;

  if (id) {
    await updateAutomationRule(id, data);
    return NextResponse.json({ ok: true });
  }

  if (!data.name || !data.trigger_event || !data.template_id?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const newId = await upsertAutomationRule({
    channel: "email",
    active: true,
    delay_hours: 0,
    order: 99,
    trigger_condition: "",
    ...data,
  });
  return NextResponse.json({ id: newId });
}

export async function DELETE(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await deleteAutomationRule(id);
  return NextResponse.json({ ok: true });
}

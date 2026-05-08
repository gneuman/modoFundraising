import { NextRequest, NextResponse } from "next/server";
import { saveChurnReason } from "@/lib/airtable";

const VALID_REASONS = ["precio", "tiempo", "prioridades", "ronda_cerrada", "expectativas", "otro"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const reason = searchParams.get("reason");

  if (!id || !reason) {
    return NextResponse.json({ error: "Missing id or reason" }, { status: 400 });
  }

  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  try {
    await saveChurnReason(id, reason);
    return NextResponse.redirect(
      new URL(`/feedback/unsubscribe?id=${id}&reason=${reason}&saved=1`, req.url)
    );
  } catch (err) {
    console.error("saveChurnReason error:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

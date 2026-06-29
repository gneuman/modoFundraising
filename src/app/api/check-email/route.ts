import { NextRequest, NextResponse } from "next/server";
import { getApplicationByEmail } from "@/lib/airtable";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const existing = await getApplicationByEmail(email.trim().toLowerCase());
  if (!existing) return NextResponse.json({ exists: false });

  return NextResponse.json({
    exists: true,
    submission: {
      email,
      startup_name: existing.startup_name ?? "",
      founder_name: `${existing.first_name ?? ""} ${existing.last_name ?? ""}`.trim(),
      submitted_at: existing.created_at ?? new Date().toISOString(),
    },
  });
}

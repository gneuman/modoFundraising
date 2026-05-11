import { NextRequest, NextResponse } from "next/server";
import { getApplicationByEmail } from "@/lib/airtable";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const existing = await getApplicationByEmail(email.trim().toLowerCase());
  return NextResponse.json({ exists: !!existing });
}

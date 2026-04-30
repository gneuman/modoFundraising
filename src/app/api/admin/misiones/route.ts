import { NextRequest, NextResponse } from "next/server";
import { createMision, updateMision } from "@/lib/airtable";

export async function POST(req: NextRequest) {

  const body = await req.json();
  const id = await createMision(body);
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {

  const { id, ...data } = await req.json();
  await updateMision(id, data);
  return NextResponse.json({ success: true });
}

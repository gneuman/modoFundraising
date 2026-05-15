import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TOKEN = (process.env.AIRTABLE_TOKEN ?? process.env.AIRTABLE_PAT)!;
const STARTUPS_TABLE = "Startups";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const startupRecordId = formData.get("startupRecordId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!startupRecordId) {
      return NextResponse.json({ error: "No startupRecordId provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Airtable Upload Attachment API
    const url = `https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${startupRecordId}/Logo/uploadAttachment`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: file.type,
        filename: file.name,
        file: base64,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Airtable upload error:", err);
      return NextResponse.json({ error: "Airtable upload failed", detail: err }, { status: 500 });
    }

    const data = await res.json();
    // Airtable returns { attachment: { id, url, ... } }
    const attachmentUrl = data?.attachment?.url ?? data?.url ?? "";

    return NextResponse.json({ url: attachmentUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

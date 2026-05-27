export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import {
  setApplicationPortalAccess,
  activateAllFoundersForApplication,
  deactivateAllFoundersForApplication,
} from "@/lib/airtable";

export async function PATCH(req: NextRequest) {
  const denied = await verificarAdmin(req);
  if (denied) return denied;

  const { recordId, access } = await req.json();
  if (!recordId || typeof access !== "boolean") {
    return NextResponse.json({ error: "Faltan recordId o access" }, { status: 400 });
  }

  try {
    await setApplicationPortalAccess(recordId, access);
    if (access) {
      await activateAllFoundersForApplication(recordId);
    } else {
      await deactivateAllFoundersForApplication(recordId);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[portal-access] error recordId=${recordId}`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

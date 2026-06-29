import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { getFounderProfile, getFounderByEmail, upsertAsistencia } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const { claseId, email: emailBody } = await req.json();

  if (!claseId) {
    return NextResponse.json({ error: "claseId requerido" }, { status: 400 });
  }

  // Determine email: from session or from body (Calendar Link flow)
  let email: string | null = null;
  const session = await obtenerSesion();
  if (session?.email) {
    email = session.email;
  } else if (emailBody) {
    email = emailBody;
  }

  if (!email) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  // Resolve startupId
  const profile = await getFounderProfile(email);

  if (!profile) {
    // Check if founder exists at all
    const founder = await getFounderByEmail(email);
    if (!founder) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: "no_startup" }, { status: 404 });
  }

  if (!profile.portal_access) {
    return NextResponse.json({ error: "no_access" }, { status: 403 });
  }

  const startupId = profile.startup_record_id;
  if (!startupId) {
    return NextResponse.json({ error: "no_startup" }, { status: 404 });
  }

  await upsertAsistencia({ startupId, claseId, asistio: true });

  return NextResponse.json({
    ok: true,
    startupId,
    startupName: profile.startup_name,
  });
}

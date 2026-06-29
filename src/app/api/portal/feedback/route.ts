import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { getAllApplications, createFeedback, getAllFeedback } from "@/lib/airtable";

export const dynamic = "force-dynamic";

// POST /api/portal/feedback
// Body: { ratings: { claseId: string; rating: number; comentario?: string }[] }
export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || session.role !== "founder") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { ratings } = await req.json() as {
    ratings: { claseId: string; rating: number; comentario?: string }[];
  };

  if (!Array.isArray(ratings) || ratings.length === 0) {
    return NextResponse.json({ error: "ratings requerido" }, { status: 400 });
  }

  const apps = await getAllApplications();
  const app = apps.find(
    (a) =>
      a.email === session.email &&
      (a.status === "Inscrita" || a.status === "Invitada institucional")
  );
  const startupId = app?.startup_record?.[0] as string | undefined;

  if (!startupId) {
    return NextResponse.json({ error: "Startup no encontrada" }, { status: 404 });
  }

  await Promise.all(
    ratings.map((r) =>
      createFeedback({
        startupId,
        claseId: r.claseId,
        rating: r.rating,
        comentario: r.comentario,
      })
    )
  );

  return NextResponse.json({ ok: true });
}

// GET /api/portal/feedback?claseIds=id1,id2
// Devuelve si la startup ya dejó feedback para esas clases
export async function GET(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || session.role !== "founder") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const claseIds = req.nextUrl.searchParams.get("claseIds")?.split(",").filter(Boolean) ?? [];

  const apps = await getAllApplications();
  const app = apps.find(
    (a) =>
      a.email === session.email &&
      (a.status === "Inscrita" || a.status === "Invitada institucional")
  );
  const startupId = app?.startup_record?.[0] as string | undefined;

  if (!startupId) {
    return NextResponse.json({ submitted: false, feedbacks: [] });
  }

  const allFeedback = await getAllFeedback();
  const mine = allFeedback.filter(
    (f) =>
      f.startup_record?.includes(startupId) &&
      claseIds.some((id) => f.clase_record?.includes(id))
  );

  return NextResponse.json({
    submitted: mine.length >= claseIds.length,
    feedbacks: mine.map((f) => ({
      claseId: f.clase_record?.[0],
      rating: f.rating,
      comentario: f.comentario,
    })),
  });
}

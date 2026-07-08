import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { obtenerSesion } from "@/lib/auth";
import { verificarTokenDia } from "@/lib/late-token";
import {
  getAllApplications,
  createFeedback,
  getAllFeedback,
  getTareaByIdFresh,
  recomputeMisionCompletada,
} from "@/lib/airtable";

export const dynamic = "force-dynamic";

// POST /api/portal/feedback
// Body: { tareaId?: string; startupId?: string; ratings: { claseId, rating, comentario? }[] }
export async function POST(req: NextRequest) {
  const session = await obtenerSesion();
  // Admins también pueden llamar el endpoint (para testear como cualquier
  // startup con ?as=). Founders solo pueden llamar como sí mismos. Mismo patrón
  // que POST /api/portal/consignas — antes esta guarda rechazaba admins (401).
  if (!session || (session.role !== "founder" && session.role !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { tareaId, startupId: adminStartupId, t: lateToken, ratings } = await req.json() as {
    tareaId?: string;
    startupId?: string;
    t?: string;
    ratings: { claseId: string; rating: number; comentario?: string }[];
  };

  if (!Array.isArray(ratings) || ratings.length === 0) {
    return NextResponse.json({ error: "ratings requerido" }, { status: 400 });
  }

  // El campo `rating` en Airtable es tipo rating (max 5) y NO acepta 0 ni
  // valores fuera de 1-5 vía API. Validamos antes para dar un 400 claro en vez
  // de un error crudo de Airtable.
  const ratingInvalido = ratings.find(
    (r) => !Number.isInteger(r.rating) || r.rating < 1 || r.rating > 5,
  );
  if (ratingInvalido) {
    return NextResponse.json(
      { error: "Cada calificación debe ser un entero entre 1 y 5" },
      { status: 400 },
    );
  }

  // Derivar startupId:
  //   - Admin: acepta startupId del body para poder testear como cualquier startup
  //   - Founder: siempre de la sesión (nunca del body), matcheando cofounders
  let startupId: string | undefined;
  if (session.role === "admin" && adminStartupId) {
    startupId = adminStartupId;
  } else {
    const apps = await getAllApplications({ includeTest: true });
    const emailLower = session.email.toLowerCase();
    const app = apps.find((a) => {
      // "Modo Foco - Test" es la startup sandbox: cualquier status vale.
      const isTestStartup = a.startup_name === "Modo Foco - Test";
      const isEnrolled =
        a.status === "Inscrita" || a.status === "Invitada institucional";
      if (!isEnrolled && !isTestStartup) return false;
      // Matchea principal + todos los cofounders (case-insensitive).
      const allEmails = [a.email, ...(a.all_founder_emails ?? [])]
        .filter(Boolean)
        .map((e) => e!.toLowerCase());
      return allEmails.includes(emailLower);
    });
    startupId = app?.startup_record?.[0] as string | undefined;
  }

  if (!startupId) {
    return NextResponse.json(
      {
        error:
          session.role === "admin"
            ? "Como admin, debes pasar `startupId` en el body para testear (tu email no tiene startup asignada)."
            : "Startup no encontrada",
      },
      { status: session.role === "admin" ? 403 : 404 },
    );
  }

  // Entrega tardía (OP-1905): si viene un token del día válido, marcamos el
  // feedback como atrasado con la fecha que codifica el token.
  const fechaTardia = (await verificarTokenDia(lateToken)) ?? undefined;

  await Promise.all(
    ratings.map((r) =>
      createFeedback({
        startupId,
        claseId: r.claseId,
        rating: r.rating,
        comentario: r.comentario,
        fechaTardia,
      })
    )
  );

  // Recalcular "Misiones Completadas" en Airtable. Sin esto, una misión cuya
  // única tarea es la encuesta (tipo Feedback) nunca pasaba a Completada: el
  // recompute solo corría desde POST /api/portal/consignas. Completada = lo que
  // quedó escrito en Airtable, así que hay que dispararlo aquí también.
  if (tareaId) {
    const tarea = await getTareaByIdFresh(tareaId);
    const misionId = tarea?.mision?.[0];
    if (misionId) {
      await recomputeMisionCompletada(startupId, misionId);
      revalidateTag("clases-content", { expire: 0 });
    }
  }

  return NextResponse.json({ ok: true });
}

// GET /api/portal/feedback?claseIds=id1,id2
// Devuelve si la startup ya dejó feedback para esas clases
export async function GET(req: NextRequest) {
  const session = await obtenerSesion();
  if (!session || (session.role !== "founder" && session.role !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const claseIds = req.nextUrl.searchParams.get("claseIds")?.split(",").filter(Boolean) ?? [];

  const apps = await getAllApplications({ includeTest: true });
  const app = apps.find(
    (a) =>
      a.email === session.email &&
      // "Modo Foco - Test" es la startup sandbox: cualquier status vale.
      (a.status === "Inscrita" ||
        a.status === "Invitada institucional" ||
        a.startup_name === "Modo Foco - Test")
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

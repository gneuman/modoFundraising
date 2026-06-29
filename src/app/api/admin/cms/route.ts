import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "@/lib/admin-auth";
import {
  getLandingTextos,
  setLandingTextos,
  getLandingCards,
  setLandingCards,
  getHomeCasosExitoAll,
  updateHomeCasoExito,
  getAdvisorsAll,
  updateAdvisor,
  getInstructores,
  setInstructores,
  type LandingCard,
  type HomeCasoExitoExtended,
  type AdvisorExtended,
  type Instructor,
} from "@/lib/airtable";

export async function GET(req: NextRequest) {
  const guard = await verificarAdmin(req);
  if (guard) return guard;

  const [textos, outcomes, pillars, casos, advisors, instructores] = await Promise.all([
    getLandingTextos(),
    getLandingCards("outcome"),
    getLandingCards("pillar"),
    getHomeCasosExitoAll(),
    getAdvisorsAll(),
    getInstructores(),
  ]);

  return NextResponse.json({ textos, outcomes, pillars, casos, advisors, instructores });
}

export async function POST(req: NextRequest) {
  const guard = await verificarAdmin(req);
  if (guard) return guard;

  const body = await req.json() as {
    seccion: "hero" | "outcomes" | "pillars" | "casos" | "advisors" | "instructores";
    data: unknown;
  };

  try {
    switch (body.seccion) {
      case "hero":
        await setLandingTextos(body.data as Record<string, string>);
        break;
      case "outcomes":
        await setLandingCards("outcome", body.data as Omit<LandingCard, "id">[]);
        break;
      case "pillars":
        await setLandingCards("pillar", body.data as Omit<LandingCard, "id">[]);
        break;
      case "casos": {
        const items = body.data as HomeCasoExitoExtended[];
        await Promise.all(
          items.filter((c) => c.id).map((c) => updateHomeCasoExito(c.id!, c))
        );
        break;
      }
      case "advisors": {
        const items = body.data as AdvisorExtended[];
        await Promise.all(
          items.filter((a) => a.id).map((a) => updateAdvisor(a.id!, a))
        );
        break;
      }
      case "instructores":
        await setInstructores(body.data as Instructor[]);
        break;
      default:
        return NextResponse.json({ error: "Sección inválida" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/admin/cms]", err);
    return NextResponse.json({ error: "Error guardando datos" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getClasesWithContent, updateClase } from "@/lib/airtable";
import { getMeetRecordings, makeFilePublic } from "@/lib/drive";

const CRON_SECRET = process.env.CRON_SECRET ?? "";
// Ventana de búsqueda: busca grabaciones creadas hasta N horas después de que empezó la clase
const WINDOW_HOURS_AFTER = 4;

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const query = req.nextUrl.searchParams.get("secret") ?? "";
  return CRON_SECRET !== "" && (auth === `Bearer ${CRON_SECRET}` || query === CRON_SECRET);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clases = await getClasesWithContent();

  // Clases "En vivo" que ya terminaron (fecha + 90 min pasó) y sin grabación asignada
  const now = Date.now();
  const pendientes = clases.filter((c) => {
    if (c.status !== "En vivo") return false;
    if (c.url_grabacion) return false; // ya tiene grabación
    if (!c.fecha) return false;
    const inicio = new Date(c.fecha).getTime();
    const finEstimado = inicio + 90 * 60 * 1000; // 90 minutos de clase
    return now > finEstimado;
  });

  if (pendientes.length === 0) {
    return NextResponse.json({ processed: 0, message: "No hay clases pendientes de grabación" });
  }

  const results: { claseId: string; titulo: string; status: "assigned" | "not_found" | "error"; url?: string }[] = [];

  for (const clase of pendientes) {
    try {
      const claseStart = new Date(clase.fecha!);
      // Buscar grabaciones desde 1 hora antes de la clase hasta WINDOW_HOURS_AFTER después
      const since = new Date(claseStart.getTime() - 60 * 60 * 1000);
      const sinceStr = since.toISOString().split("T")[0];

      const recordings = await getMeetRecordings(sinceStr);

      // Filtrar por ventana temporal: creadas entre (clase - 1h) y (clase + WINDOW_HOURS_AFTER)
      const windowEnd = claseStart.getTime() + WINDOW_HOURS_AFTER * 60 * 60 * 1000;
      const candidatas = recordings.filter((r) => {
        const created = new Date(r.createdTime).getTime();
        return created >= since.getTime() && created <= windowEnd;
      });

      if (candidatas.length === 0) {
        results.push({ claseId: clase.id!, titulo: clase.titulo ?? "", status: "not_found" });
        continue;
      }

      // Tomar la más reciente dentro de la ventana
      const mejor = candidatas.sort(
        (a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
      )[0];

      // Hacer pública la grabación
      await makeFilePublic(mejor.id);
      const shareUrl = `https://drive.google.com/file/d/${mejor.id}/view`;

      // Actualizar clase en Airtable: asignar grabación y cambiar status a Grabada
      await updateClase(clase.id!, {
        url_grabacion: shareUrl,
        status: "Grabada",
      });

      results.push({ claseId: clase.id!, titulo: clase.titulo ?? "", status: "assigned", url: shareUrl });
    } catch (err) {
      results.push({ claseId: clase.id!, titulo: clase.titulo ?? "", status: "error" });
      console.error(`sync-recordings error clase ${clase.id}:`, err);
    }
  }

  const assigned = results.filter((r) => r.status === "assigned").length;
  return NextResponse.json({ processed: results.length, assigned, results });
}

// GET para que n8n pueda hacer ping simple y ver el estado
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, endpoint: "sync-recordings", method: "POST" });
}

import { getAllFeedback, getClasesWithContentCached, type FeedbackRecord, type ClaseRecord } from "@/lib/airtable";
import { Star, MessageSquare, Users } from "lucide-react";

export const dynamic = "force-dynamic";

function promedio(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  return ratings.reduce((s, r) => s + r, 0) / ratings.length;
}

interface ClaseNps {
  claseId: string;
  titulo: string;
  semana?: number;
  fecha?: string;
  n: number;
  promedio: number;
  comentarios: { texto: string; rating: number; fecha?: string }[];
}

export default async function NpsPage() {
  const [feedback, clases] = await Promise.all([
    getAllFeedback().catch(() => [] as FeedbackRecord[]),
    getClasesWithContentCached().catch(() => [] as ClaseRecord[]),
  ]);

  const claseById = new Map<string, ClaseRecord>();
  clases.forEach((c) => {
    if (c.id) claseById.set(c.id, c);
  });

  // Agrupar feedback por clase
  const byClase = new Map<string, FeedbackRecord[]>();
  for (const f of feedback) {
    const claseId = f.clase_record?.[0];
    if (!claseId || typeof f.rating !== "number") continue;
    const prev = byClase.get(claseId) ?? [];
    prev.push(f);
    byClase.set(claseId, prev);
  }

  const rows: ClaseNps[] = [...byClase.entries()].map(([claseId, fbs]) => {
    const ratings = fbs.map((f) => f.rating as number);
    const clase = claseById.get(claseId);
    return {
      claseId,
      titulo: clase?.titulo ?? "(clase sin título)",
      semana: clase?.semana,
      fecha: clase?.fecha,
      n: ratings.length,
      promedio: promedio(ratings),
      comentarios: fbs
        .filter((f) => (f.comentario ?? "").trim())
        .map((f) => ({ texto: f.comentario!.trim(), rating: f.rating as number, fecha: f.fecha }))
        .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? "")),
    };
  });

  // Orden: por semana desc (lo más reciente arriba), luego por título.
  rows.sort((a, b) => {
    const sa = a.semana ?? -1;
    const sb = b.semana ?? -1;
    if (sb !== sa) return sb - sa;
    return a.titulo.localeCompare(b.titulo);
  });

  // Globales
  const allRatings = feedback
    .map((f) => f.rating)
    .filter((r): r is number => typeof r === "number");
  const promedioGlobal = promedio(allRatings);
  const totalRespuestas = allRatings.length;
  const totalComentarios = feedback.filter((f) => (f.comentario ?? "").trim()).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Feedback Sesiones</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Feedback de los founders por clase · escala 1-10
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-amber-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Promedio Feedback</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {promedioGlobal.toFixed(1)}<span className="text-sm text-zinc-400 font-normal">/10</span>
          </p>
          <p className="text-xs text-zinc-400 mt-1">de todas las sesiones</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-zinc-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Respuestas</p>
          </div>
          <p className="text-2xl font-bold text-zinc-800">{totalRespuestas}</p>
          <p className="text-xs text-zinc-400 mt-1">en {rows.length} clases</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-purple-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Comentarios</p>
          </div>
          <p className="text-2xl font-bold text-purple-700">{totalComentarios}</p>
          <p className="text-xs text-zinc-400 mt-1">con texto libre</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center text-zinc-400">
          Aún no hay feedback de sesiones registrado.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.claseId} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-zinc-800 truncate">{r.titulo}</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {r.semana !== undefined ? `Semana ${r.semana} · ` : ""}
                    {r.n} {r.n === 1 ? "respuesta" : "respuestas"}
                  </p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-600">{r.promedio.toFixed(1)}<span className="text-xs text-zinc-400 font-normal">/10</span></p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Promedio</p>
                  </div>
                </div>
              </div>

              {r.comentarios.length > 0 && (
                <ul className="divide-y divide-zinc-50">
                  {r.comentarios.map((c, i) => (
                    <li key={i} className="px-6 py-3 flex items-start gap-3">
                      <span
                        className={`shrink-0 mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                          c.rating >= 9
                            ? "bg-green-100 text-green-700"
                            : c.rating <= 6
                            ? "bg-red-100 text-red-600"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {c.rating}
                      </span>
                      <p className="text-sm text-zinc-600 italic">&ldquo;{c.texto}&rdquo;</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

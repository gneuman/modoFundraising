"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import type { TareaRecord } from "@/lib/airtable";

interface NpsFormProps {
  tarea: TareaRecord;
  clases: { id: string; titulo: string }[];
  initialSubmitted?: boolean;
}

// Sentinela: "sin calificar". No usamos undefined vs 0 porque 0 es una
// calificación válida (peor nota), así que necesitamos distinguir el estado
// "todavía no eligió" de "eligió 0 estrellas".
const SIN_CALIFICAR = -1;

export function NpsForm({ tarea, clases, initialSubmitted }: NpsFormProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hover, setHover] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(initialSubmitted ?? false);
  const [error, setError] = useState<string | null>(null);

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-medium">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Feedback enviado. ¡Gracias!
      </div>
    );
  }

  // Calificación obligatoria (0-5); el comentario es opcional.
  const allRated = clases.every(
    (c) => ratings[c.id] !== undefined && ratings[c.id] !== SIN_CALIFICAR,
  );

  async function handleSubmit() {
    if (!allRated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tareaId: tarea.id,
          ratings: clases.map((c) => ({
            claseId: c.id,
            rating: ratings[c.id],
            comentario: comentarios[c.id] ?? "",
          })),
        }),
      });
      if (!res.ok) throw new Error("Error al enviar");
      setSubmitted(true);
    } catch {
      setError("Hubo un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {clases.map((clase) => {
        const rated = ratings[clase.id] ?? SIN_CALIFICAR;
        const preview = hover[clase.id] ?? rated;
        return (
          <div key={clase.id} className="space-y-2">
            <p className="text-sm font-semibold text-zinc-700">{clase.titulo}</p>

            {/* Estrellas 0-5. La estrella "0" es un botón aparte para permitir
                la peor nota sin ambigüedad con "sin calificar". */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRatings((prev) => ({ ...prev, [clase.id]: 0 }))}
                onMouseEnter={() => setHover((prev) => ({ ...prev, [clase.id]: 0 }))}
                onMouseLeave={() => setHover((prev) => { const n = { ...prev }; delete n[clase.id]; return n; })}
                className={`text-xs font-semibold px-2 h-8 rounded-lg border-2 transition-all ${
                  rated === 0
                    ? "bg-zinc-700 border-zinc-700 text-white"
                    : "border-zinc-200 text-zinc-400 hover:border-zinc-400"
                }`}
                aria-label="0 estrellas"
              >
                0
              </button>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = preview >= n && preview !== SIN_CALIFICAR;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatings((prev) => ({ ...prev, [clase.id]: n }))}
                    onMouseEnter={() => setHover((prev) => ({ ...prev, [clase.id]: n }))}
                    onMouseLeave={() => setHover((prev) => { const nx = { ...prev }; delete nx[clase.id]; return nx; })}
                    className="p-0.5 transition-transform hover:scale-110"
                    aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        active
                          ? "fill-amber-400 text-amber-400"
                          : "fill-transparent text-zinc-300"
                      }`}
                    />
                  </button>
                );
              })}
              {rated !== SIN_CALIFICAR && (
                <span className="ml-1.5 text-sm font-bold text-zinc-500">{rated}/5</span>
              )}
            </div>

            {/* Comentario opcional */}
            <textarea
              placeholder="Comentario opcional..."
              rows={2}
              value={comentarios[clase.id] ?? ""}
              onChange={(e) => setComentarios((prev) => ({ ...prev, [clase.id]: e.target.value }))}
              className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 text-zinc-700 placeholder-zinc-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
        );
      })}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!allRated || loading}
        className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Enviar feedback
      </button>
    </div>
  );
}

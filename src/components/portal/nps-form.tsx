"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import type { TareaRecord } from "@/lib/airtable";

interface NpsFormProps {
  tarea: TareaRecord;
  clases: { id: string; titulo: string }[];
  initialSubmitted?: boolean;
}

// Sentinela: "sin calificar". La nota válida es 1-5 (el campo `rating` en
// Airtable es tipo rating y no acepta 0), así que -1 marca "todavía no eligió".
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

  // Calificación 1-5, obligatoria (no se puede enviar sin elegir estrella).
  // El comentario sí puede quedar vacío (opcional).
  const allRated = clases.every(
    (c) => ratings[c.id] !== undefined && ratings[c.id] !== SIN_CALIFICAR,
  );

  async function handleSubmit() {
    if (!allRated) return;
    setLoading(true);
    setError(null);
    try {
      // Query params relevantes de la URL:
      //   - ?as=recXXX: admin impersonando → guardar en esa startup.
      //   - ?t=<token>: link admin de misiones atrasadas → marcar entrega tardía.
      // Los founders sin estos params envían normal.
      const qs =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams();
      const adminStartupId = qs.get("as") ?? undefined;
      const lateToken = qs.get("t") ?? undefined;
      const res = await fetch("/api/portal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tareaId: tarea.id,
          startupId: adminStartupId,
          t: lateToken,
          ratings: clases.map((c) => {
            const comentario = (comentarios[c.id] ?? "").trim();
            // Comentario opcional: si está vacío no lo mandamos.
            return comentario
              ? { claseId: c.id, rating: ratings[c.id], comentario }
              : { claseId: c.id, rating: ratings[c.id] };
          }),
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

            {/* Estrellas 1-5. El campo `rating` en Airtable es tipo rating
                (icono estrella, max 5) y NO acepta 0 vía API, así que la nota
                mínima es 1. Coincide con la copia: "nota de 1 a 5 estrellas". */}
            <div className="flex items-center gap-1.5">
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

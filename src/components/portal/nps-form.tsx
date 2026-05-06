"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { TareaRecord, ClaseRecord } from "@/lib/airtable";

interface NpsFormProps {
  tarea: TareaRecord;
  clases: { id: string; titulo: string }[];
  initialSubmitted?: boolean;
}

export function NpsForm({ tarea, clases, initialSubmitted }: NpsFormProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
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

  const allRated = clases.every((c) => ratings[c.id] !== undefined);

  async function handleSubmit() {
    if (!allRated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      {clases.map((clase) => (
        <div key={clase.id} className="space-y-2">
          <p className="text-sm font-semibold text-zinc-700">{clase.titulo}</p>

          {/* Escala 1-10 */}
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const selected = ratings[clase.id] === n;
              const color =
                n <= 6 ? "border-red-200 hover:border-red-400 hover:bg-red-50 data-[selected=true]:bg-red-500 data-[selected=true]:border-red-500 data-[selected=true]:text-white"
                : n <= 8 ? "border-amber-200 hover:border-amber-400 hover:bg-amber-50 data-[selected=true]:bg-amber-500 data-[selected=true]:border-amber-500 data-[selected=true]:text-white"
                : "border-green-200 hover:border-green-400 hover:bg-green-50 data-[selected=true]:bg-green-600 data-[selected=true]:border-green-600 data-[selected=true]:text-white";
              return (
                <button
                  key={n}
                  data-selected={selected}
                  onClick={() => setRatings((prev) => ({ ...prev, [clase.id]: n }))}
                  className={`w-9 h-9 rounded-lg border-2 text-sm font-bold transition-all ${color} ${selected ? "" : "text-zinc-600"}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-zinc-400 px-0.5">
            <span>Muy mala</span>
            <span>Excelente</span>
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
      ))}

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

"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { formatFechaSinHora as formatFecha } from "@/lib/timezone";

interface HistorialItem {
  id: string;
  titulo: string;
  semana?: number;
  fecha_limite?: string;
  fecha_completada?: string;
  completada?: boolean;
}

interface HistorialMisionesProps {
  misiones: HistorialItem[];
}

export function HistorialMisiones({ misiones }: HistorialMisionesProps) {
  const [open, setOpen] = useState(false);

  if (misiones.length === 0) return null;

  const completadas = misiones.filter((m) => m.completada).length;

  return (
    <div className="border-t border-zinc-200 pt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Historial de misiones ({misiones.length}
        {completadas > 0 ? ` · ${completadas} completadas` : ""})
      </button>

      {open && (
        <div className="mt-4 space-y-2">
          {misiones.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-lg border border-zinc-200 px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {m.completada ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-zinc-300 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-700 truncate">
                    {m.semana ? `S${m.semana} — ` : ""}{m.titulo}
                  </p>
                  {m.fecha_completada && (
                    <p className="text-xs text-zinc-400">
                      Completada el {formatFecha(m.fecha_completada)}
                    </p>
                  )}
                  {!m.fecha_completada && m.fecha_limite && (
                    <p className="text-xs text-zinc-400">
                      Cerrada el {formatFecha(m.fecha_limite)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

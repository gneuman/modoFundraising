"use client";

import { useState, type ReactNode } from "react";
import {
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

// Card de misión activa colapsable (OP-2022). Con varias misiones activas la
// página se hacía larguísima, así que cada card puede colapsarse a solo el
// header. `defaultOpen` deja la primera (más reciente) abierta y el resto
// cerradas. El contenido (descripción + tareas) llega como children ya
// renderizado desde el server component, así los forms client siguen igual.
export function MisionActivaCard({
  titulo,
  semana,
  claseTitulo,
  status,
  fechaLimiteLabel,
  days,
  isCompletada,
  tareasCount,
  completadasCount,
  defaultOpen,
  children,
}: {
  titulo: string;
  semana?: number;
  claseTitulo?: string;
  status?: string;
  fechaLimiteLabel: string | null;
  days: number | null;
  isCompletada: boolean;
  tareasCount: number;
  completadasCount: number;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const border = isCompletada
    ? "border-green-300"
    : days !== null && days <= 2
    ? "border-red-300"
    : "border-amber-300";

  const deadlineColor =
    days !== null && days <= 2
      ? "text-red-600"
      : days !== null && days <= 5
      ? "text-amber-600"
      : "text-zinc-500";

  return (
    <div className={`bg-white rounded-2xl border-2 ${border} overflow-hidden transition-all`}>
      {/* Header — clickeable para colapsar/expandir */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left p-6 flex items-start justify-between gap-3 hover:bg-zinc-50/60 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 shrink-0">
            {isCompletada ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className={`font-bold text-lg leading-tight ${isCompletada ? "text-green-800" : "text-zinc-800"}`}>
              {titulo}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
              <BookOpen className="h-3 w-3 shrink-0" />
              <span className="truncate">Semana {semana} — {claseTitulo}</span>
            </p>
            {/* Meta compacta: visible sobre todo cuando está colapsada */}
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-zinc-400">
                {completadasCount}/{tareasCount} tareas
              </span>
              {!isCompletada && fechaLimiteLabel && (
                <span className={`flex items-center gap-1 font-medium ${deadlineColor}`}>
                  <Clock className="h-3 w-3" />
                  {fechaLimiteLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isCompletada ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {isCompletada ? "Completada" : status ?? "Activa"}
          </span>
          <ChevronDown
            className={`h-5 w-5 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Contenido colapsable */}
      {open && (
        <div className="px-6 pb-6 space-y-5 border-t border-zinc-100 pt-5">
          {children}
        </div>
      )}
    </div>
  );
}

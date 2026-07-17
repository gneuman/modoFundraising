"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CHURN_REASON_LABELS, type ChurnReasonCode } from "@/lib/airtable";

const FILTER_TABS = [
  { key: "todos", label: "Todos" },
  { key: "en_ventana", label: "Elegibles reembolso (≤14d)" },
  { key: "reembolsados", label: "Ya reembolsados" },
  { key: "fuera_ventana", label: "Fuera de ventana" },
];

const TIPO_TABS = [
  { key: "todos", label: "Todas" },
  { key: "no_pago", label: "No pago" },
  { key: "voluntaria", label: "Voluntaria" },
  { key: "manual", label: "Cancelación manual" },
];

export function ChurnFilters({
  currentFilter,
  currentReason,
  currentTipo,
  reasonOptions,
}: {
  currentFilter: string;
  currentReason: string;
  currentTipo: string;
  reasonOptions: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: "filter" | "reason" | "tipo", value: string) {
    const q = new URLSearchParams(params);
    if (value === "todos") q.delete(key);
    else q.set(key, value);
    const qs = q.toString();
    router.push(`/admin/churn${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-500 mr-1">Tipo de baja:</span>
        {TIPO_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => update("tipo", t.key)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              currentTipo === t.key
                ? "bg-red-600 text-white border-red-600"
                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => update("filter", t.key)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              currentFilter === t.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {reasonOptions.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Motivo:</span>
          <select
            value={currentReason}
            onChange={(e) => update("reason", e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos</option>
            {reasonOptions.map((code) => (
              <option key={code} value={code}>
                {CHURN_REASON_LABELS[code as ChurnReasonCode] ?? code}
              </option>
            ))}
          </select>
        </div>
      )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { HomeCasoExitoExtended } from "@/lib/airtable";

interface CasosTabProps {
  casos: HomeCasoExitoExtended[];
}

export function CasosTab({ casos: initial }: CasosTabProps) {
  const [casos, setCasos] = useState<HomeCasoExitoExtended[]>(initial);
  const [saving, setSaving] = useState(false);

  const update = (i: number, field: keyof HomeCasoExitoExtended, value: unknown) => {
    setCasos((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion: "casos", data: casos }),
      });
      if (!res.ok) throw new Error();
      toast.success("Casos de éxito guardados");
    } catch {
      toast.error("Error guardando casos");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-zinc-800">Casos de Éxito</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          8 startups alumni. Marca "Destacado" en los 3 con quote completo para la sección especial.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_60px_80px_32px] gap-3 px-4 py-2 bg-zinc-50 border-b border-zinc-100">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Startup</span>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Monto US$</span>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">País</span>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide text-center">Destacado</span>
          <span />
        </div>

        {casos.map((caso, i) => (
          <div key={caso.id ?? i} className="border-b border-zinc-50 last:border-0">
            <div className="grid grid-cols-[1fr_80px_60px_80px_32px] gap-3 px-4 py-3 items-center">
              <input
                type="text"
                className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={caso.startup_nombre ?? ""}
                onChange={(e) => update(i, "startup_nombre", e.target.value)}
              />
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={caso.monto_usd ?? ""}
                onChange={(e) => update(i, "monto_usd", Number(e.target.value))}
              />
              <input
                type="text"
                placeholder="🇨🇱"
                className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={caso.pais_emoji ?? ""}
                onChange={(e) => update(i, "pais_emoji", e.target.value)}
              />
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-blue-600"
                  checked={caso.destacado_quote ?? false}
                  onChange={(e) => update(i, "destacado_quote", e.target.checked)}
                />
              </div>
              <button
                className="text-xs text-zinc-300 hover:text-zinc-500"
                onClick={() => update(i, "activa", !caso.activa)}
                title={caso.activa ? "Desactivar" : "Activar"}
              >
                {caso.activa ? "●" : "○"}
              </button>
            </div>
            {caso.destacado_quote && (
              <div className="px-4 pb-3 space-y-2">
                <textarea
                  placeholder="Quote del founder..."
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  value={caso.quote_destacado ?? ""}
                  onChange={(e) => update(i, "quote_destacado", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="LinkedIn URL"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={caso.link_linkedin ?? ""}
                  onChange={(e) => update(i, "link_linkedin", e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? "Guardando…" : "Guardar Casos"}
        </button>
      </div>
    </div>
  );
}

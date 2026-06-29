"use client";

import { useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import type { AdvisorExtended } from "@/lib/airtable";

interface AdvisorsTabProps {
  advisors: AdvisorExtended[];
}

export function AdvisorsTab({ advisors: initial }: AdvisorsTabProps) {
  const [advisors, setAdvisors] = useState<AdvisorExtended[]>(initial);
  const [saving, setSaving] = useState(false);

  const update = (i: number, field: keyof AdvisorExtended, value: unknown) => {
    setAdvisors((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  };

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion: "advisors", data: advisors }),
      });
      if (!res.ok) throw new Error();
      toast.success("Advisors guardados");
    } catch {
      toast.error("Error guardando advisors");
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, a: AdvisorExtended, i: number, key: keyof AdvisorExtended) => (
    <div className="space-y-1">
      <label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">{label}</label>
      <input
        type="text"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={(a[key] as string | number) ?? ""}
        onChange={(e) => update(i, key, e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-zinc-800">Advisors</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Sesiones 1:1 con advisors. Actualiza cupos y Calendly antes de publicar.</p>
      </div>

      {advisors.map((advisor, i) => (
        <div key={advisor.id ?? i} className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            {advisor.foto_url ? (
              <Image
                src={advisor.foto_url}
                alt={advisor.nombre}
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover border border-zinc-200 flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-xl font-bold flex-shrink-0">
                {advisor.nombre?.[0] ?? "?"}
              </div>
            )}
            <div>
              <p className="font-bold text-zinc-800">{advisor.nombre}</p>
              <p className="text-sm text-zinc-500">{advisor.cargo}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">Cupos disponibles</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={advisor.cupos_disponibles ?? ""}
                onChange={(e) => update(i, "cupos_disponibles", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">Cupos total</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={advisor.cupos_total ?? ""}
                onChange={(e) => update(i, "cupos_total", Number(e.target.value))}
              />
            </div>
          </div>

          {field("Cargo / Bio", advisor, i, "cargo")}
          {field("Calendly URL", advisor, i, "calendly_url")}
          {field("URL foto", advisor, i, "foto_url")}
        </div>
      ))}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? "Guardando…" : "Guardar Advisors"}
        </button>
      </div>
    </div>
  );
}

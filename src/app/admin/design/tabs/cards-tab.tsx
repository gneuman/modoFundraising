"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { LandingCard } from "@/lib/airtable";

interface CardsTabProps {
  outcomes: LandingCard[];
  pillars: LandingCard[];
}

function CardsList({
  label,
  items,
  onChange,
}: {
  label: string;
  items: LandingCard[];
  onChange: (items: LandingCard[]) => void;
}) {
  const update = (i: number, field: keyof LandingCard, value: string) => {
    const next = items.map((c, idx) =>
      idx === i ? { ...c, [field]: value } : c
    );
    onChange(next);
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-4">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
      {items.map((card, i) => (
        <div key={i} className="grid grid-cols-[48px_1fr_2fr] gap-3 items-start border-b border-zinc-50 pb-4 last:border-0 last:pb-0">
          <input
            type="text"
            placeholder="🎯"
            className="rounded-lg border border-zinc-200 px-2 py-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={card.icono ?? ""}
            onChange={(e) => update(i, "icono", e.target.value)}
          />
          <input
            type="text"
            placeholder="Título"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={card.titulo ?? ""}
            onChange={(e) => update(i, "titulo", e.target.value)}
          />
          <input
            type="text"
            placeholder="Descripción"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={card.descripcion ?? ""}
            onChange={(e) => update(i, "descripcion", e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

export function CardsTab({ outcomes: initO, pillars: initP }: CardsTabProps) {
  const [outcomes, setOutcomes] = useState<LandingCard[]>(initO);
  const [pillars, setPillars] = useState<LandingCard[]>(initP);
  const [saving, setSaving] = useState<"outcomes" | "pillars" | null>(null);

  async function save(seccion: "outcomes" | "pillars") {
    const data = seccion === "outcomes" ? outcomes : pillars;
    setSaving(seccion);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion, data }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${seccion === "outcomes" ? "Outcomes" : "Pillars"} guardado`);
    } catch {
      toast.error("Error guardando");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-zinc-800">Cards</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Outcomes (qué aprenden) y Pillars (por qué MF).</p>
      </div>

      <CardsList label="Outcomes — qué aprenden" items={outcomes} onChange={setOutcomes} />
      <div className="flex justify-end">
        <button
          onClick={() => save("outcomes")}
          disabled={saving === "outcomes"}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving === "outcomes" ? "Guardando…" : "Guardar Outcomes"}
        </button>
      </div>

      <CardsList label="Pillars — por qué MF" items={pillars} onChange={setPillars} />
      <div className="flex justify-end">
        <button
          onClick={() => save("pillars")}
          disabled={saving === "pillars"}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving === "pillars" ? "Guardando…" : "Guardar Pillars"}
        </button>
      </div>
    </div>
  );
}

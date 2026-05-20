"use client";

import { useState } from "react";
import { toast } from "sonner";
import Image from "next/image";

interface HeroTabProps {
  textos: Record<string, string>;
}

export function HeroTab({ textos: initial }: HeroTabProps) {
  const [data, setData] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: string) =>
    setData((prev) => ({ ...prev, [key]: value }));

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion: "hero", data }),
      });
      if (!res.ok) throw new Error();
      toast.success("Hero guardado");
    } catch {
      toast.error("Error guardando hero");
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: string, long = false) => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
        {label}
      </label>
      {long ? (
        <textarea
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          value={data[key] ?? ""}
          onChange={(e) => set(key, e.target.value)}
        />
      ) : (
        <input
          type="text"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={data[key] ?? ""}
          onChange={(e) => set(key, e.target.value)}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-zinc-800">Hero</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Texto principal, foto del instructor y botones de acción.</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-4 shadow-sm">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Copy</p>
        {field("Tagline", "hero_tagline")}
        {field("Descripción", "hero_descripcion", true)}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-4 shadow-sm">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Chips de precio</p>
        <div className="grid grid-cols-2 gap-3">
          {field("Precio", "hero_chip_precio")}
          {field("Duración", "hero_chip_duracion")}
          {field("Modalidad", "hero_chip_modalidad")}
          {field("Garantía", "hero_chip_garantia")}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-4 shadow-sm">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Botones</p>
        {field("CTA primario", "hero_cta_primario")}
        {field("CTA secundario", "hero_cta_secundario")}
        {field("WhatsApp URL", "hero_whatsapp_url")}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-4 shadow-sm">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Instructor principal</p>
        {field("Nombre", "hero_instructor_nombre")}
        {field("Cargo", "hero_instructor_cargo")}
        {field("URL de foto", "hero_instructor_foto_url")}
        {data.hero_instructor_foto_url && (
          <div className="flex items-center gap-3">
            <Image
              src={data.hero_instructor_foto_url}
              alt="Preview"
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover border border-zinc-200"
              onError={() => {}}
            />
            <span className="text-xs text-zinc-400">Preview de foto</span>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? "Guardando…" : "Guardar Hero"}
        </button>
      </div>
    </div>
  );
}

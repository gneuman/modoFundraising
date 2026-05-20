"use client";

import { useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import type { Instructor } from "@/lib/airtable";

interface InstructoresTabProps {
  instructores: Instructor[];
}

const emptyInstructor = (): Instructor => ({
  nombre: "",
  foto_url: "",
  rol: "",
  org: "",
  linkedin_url: "",
  orden: 99,
  activa: true,
});

export function InstructoresTab({ instructores: initial }: InstructoresTabProps) {
  const [instructores, setInstructores] = useState<Instructor[]>(
    initial.length ? initial : [emptyInstructor()]
  );
  const [saving, setSaving] = useState(false);

  const update = (i: number, field: keyof Instructor, value: unknown) => {
    setInstructores((prev) => prev.map((inst, idx) => (idx === i ? { ...inst, [field]: value } : inst)));
  };

  const addRow = () => setInstructores((prev) => [...prev, emptyInstructor()]);
  const removeRow = (i: number) => setInstructores((prev) => prev.filter((_, idx) => idx !== i));

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion: "instructores", data: instructores }),
      });
      if (!res.ok) throw new Error();
      toast.success("Instructores guardados");
    } catch {
      toast.error("Error guardando instructores");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-800">Instructores</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Equipo docente del programa.</p>
        </div>
        <button
          onClick={addRow}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 rounded-lg px-3 py-1.5 transition-colors"
        >
          + Agregar
        </button>
      </div>

      <div className="space-y-3">
        {instructores.map((inst, i) => (
          <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-4">
              {inst.foto_url ? (
                <Image
                  src={inst.foto_url}
                  alt={inst.nombre || "Instructor"}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover border border-zinc-200 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-300 text-lg font-bold flex-shrink-0">
                  ?
                </div>
              )}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={inst.nombre}
                  onChange={(e) => update(i, "nombre", e.target.value)}
                />
              </div>
              <button
                onClick={() => removeRow(i)}
                className="text-zinc-300 hover:text-red-400 text-lg leading-none transition-colors flex-shrink-0"
                title="Eliminar"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Rol (ej. Managing Partner)"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inst.rol}
                onChange={(e) => update(i, "rol", e.target.value)}
              />
              <input
                type="text"
                placeholder="Organización (ej. Impacta VC)"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inst.org}
                onChange={(e) => update(i, "org", e.target.value)}
              />
            </div>
            <input
              type="text"
              placeholder="URL de foto"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={inst.foto_url}
              onChange={(e) => update(i, "foto_url", e.target.value)}
            />
            <input
              type="text"
              placeholder="LinkedIn URL"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={inst.linkedin_url ?? ""}
              onChange={(e) => update(i, "linkedin_url", e.target.value)}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-blue-600"
                  checked={inst.activa}
                  onChange={(e) => update(i, "activa", e.target.checked)}
                />
                Activo
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Orden</span>
                <input
                  type="number"
                  className="w-16 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={inst.orden}
                  onChange={(e) => update(i, "orden", Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? "Guardando…" : "Guardar Instructores"}
        </button>
      </div>
    </div>
  );
}

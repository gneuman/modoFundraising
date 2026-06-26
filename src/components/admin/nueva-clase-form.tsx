"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { santiagoInputToISO } from "@/lib/timezone";
import type { ClaseRecord, MisionRecord, RecursoRecord } from "@/lib/airtable";

const STATUS_CLASE = ["Próxima", "En vivo", "Grabada"] as const;

export type ClaseWithContent = ClaseRecord & {
  misionesData: MisionRecord[];
  recursosData: RecursoRecord[];
};

export function NuevaClaseForm({ onCreated }: { onCreated: (clase: ClaseWithContent) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    semana: "",
    fecha: "",
    url_live: "",
    status: "Próxima",
  });

  async function submit() {
    if (!form.titulo) return toast.error("El título es obligatorio");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/clases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          semana: Number(form.semana) || 0,
          fecha: form.fecha ? santiagoInputToISO(form.fecha) : undefined,
        }),
      });
      const { id, meet_link, meet_link_team } = await res.json();
      const url_live = form.url_live || meet_link || "";
      const url_live_team = meet_link_team || "";
      onCreated({
        id,
        ...form,
        url_live,
        meet_link,
        url_live_team,
        meet_link_team,
        semana: Number(form.semana) || 0,
        misionesData: [],
        recursosData: [],
      } as ClaseWithContent);
      setForm({ titulo: "", semana: "", fecha: "", url_live: "", status: "Próxima" });
      setOpen(false);
      toast.success("Clase creada");
    } catch {
      toast.error("Error al crear clase");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" /> Nueva clase
      </Button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4">
      <h3 className="font-semibold text-zinc-800">Nueva clase</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input
            placeholder="Título de la clase *"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />
        </div>
        <Input
          placeholder="Semana #"
          type="number"
          value={form.semana}
          onChange={(e) => setForm({ ...form, semana: e.target.value })}
        />
        <Input
          placeholder="Fecha y hora"
          type="datetime-local"
          value={form.fecha}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
        />
        <Input
          placeholder="URL Zoom / Meet"
          value={form.url_live}
          onChange={(e) => setForm({ ...form, url_live: e.target.value })}
        />
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_CLASE.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear clase"}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, FileText, Video, BookOpen, Wrench, Link2, ExternalLink, Edit2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RecursoRecord, ClaseRecord, MisionRecord } from "@/lib/airtable";

type ClaseFull = ClaseRecord & { misionesData: MisionRecord[]; recursosData: RecursoRecord[] };

const TIPOS_RECURSO = ["PDF", "Video", "Artículo", "Template", "Herramienta", "Otro"] as const;
const TIPO_COLOR: Record<string, string> = {
  "PDF":         "bg-red-50 text-red-600",
  "Video":       "bg-blue-50 text-blue-600",
  "Template":    "bg-purple-50 text-purple-600",
  "Herramienta": "bg-orange-50 text-orange-600",
  "Artículo":    "bg-emerald-50 text-emerald-600",
  "Otro":        "bg-zinc-100 text-zinc-500",
};

function TipoIcon({ tipo }: { tipo?: string }) {
  const t = tipo?.toLowerCase() ?? "";
  if (t.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
  if (t.includes("video")) return <Video className="h-4 w-4 text-blue-500" />;
  if (t.includes("template")) return <BookOpen className="h-4 w-4 text-purple-500" />;
  if (t.includes("herramienta")) return <Wrench className="h-4 w-4 text-orange-500" />;
  return <Link2 className="h-4 w-4 text-zinc-400" />;
}

function ClaseSelector({ clases, value, onChange }: {
  clases: ClaseFull[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full">
      <option value="">Sin clase asignada</option>
      {clases.sort((a, b) => (a.semana ?? 99) - (b.semana ?? 99)).map((c) => (
        <option key={c.id} value={c.id!}>
          S{c.semana} — {c.titulo}
        </option>
      ))}
    </select>
  );
}

function NuevoRecursoForm({ clases, onCreated }: {
  clases: ClaseFull[];
  onCreated: (r: RecursoRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [claseId, setClaseId] = useState("");
  const [form, setForm] = useState({ titulo: "", url: "", tipo: "PDF", descripcion: "" });

  async function submit() {
    if (!form.titulo) return toast.error("El título es obligatorio");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/recursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          claseId: claseId || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      onCreated({ id, ...form, clase: claseId ? [claseId] : undefined } as RecursoRecord);
      setForm({ titulo: "", url: "", tipo: "PDF", descripcion: "" });
      setClaseId("");
      setOpen(false);
      toast.success("Recurso creado");
    } catch { toast.error("Error al crear recurso"); }
    finally { setSaving(false); }
  }

  if (!open) return (
    <Button onClick={() => setOpen(true)} className="gap-2">
      <Plus className="h-4 w-4" /> Nuevo recurso
    </Button>
  );

  return (
    <div className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4">
      <h3 className="font-semibold text-zinc-800">Nuevo recurso</h3>
      <ClaseSelector clases={clases} value={claseId} onChange={onClaseChange} />
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Título *" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {TIPOS_RECURSO.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <Input placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
      <Input placeholder="Descripción breve" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear recurso"}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

function RecursoRow({ recurso, clases, onChange }: {
  recurso: RecursoRecord;
  clases: ClaseFull[];
  onChange: (updated: RecursoRecord) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    titulo: recurso.titulo ?? "",
    url: recurso.url ?? "",
    tipo: recurso.tipo ?? "PDF",
    descripcion: recurso.descripcion ?? "",
    claseId: (recurso.clase as string[] | undefined)?.[0] ?? "",
  });

  const claseId = (recurso.clase as string[] | undefined)?.[0];
  const clase = claseId ? clases.find((c) => c.id === claseId) : null;

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/admin/recursos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recurso.id,
          titulo: draft.titulo,
          url: draft.url || undefined,
          tipo: draft.tipo,
          descripcion: draft.descripcion || undefined,
          claseId: draft.claseId || undefined,
        }),
      });
      onChange({
        ...recurso,
        titulo: draft.titulo,
        url: draft.url || undefined,
        tipo: draft.tipo,
        descripcion: draft.descripcion || undefined,
        clase: draft.claseId ? [draft.claseId] : undefined,
      });
      setEditing(false);
      toast.success("Guardado");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  if (editing) {
    return (
      <div className="p-4 bg-blue-50/30 border-b border-zinc-100 space-y-3">
        <ClaseSelector clases={clases} value={draft.claseId} onChange={(v) => setDraft({ ...draft, claseId: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Input value={draft.titulo} onChange={(e) => setDraft({ ...draft, titulo: e.target.value })} placeholder="Título" />
          <select value={draft.tipo} onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {TIPOS_RECURSO.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <Input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="URL" />
        <Input value={draft.descripcion} onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })} placeholder="Descripción" />
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5" /> Guardar</>}
          </Button>
          <Button variant="outline" onClick={() => setEditing(false)} className="text-xs h-8">
            <X className="h-3.5 w-3.5" /> Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors group border-b border-zinc-100">
      <TipoIcon tipo={recurso.tipo} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-800 truncate">{recurso.titulo}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {clase && <span className="text-xs text-blue-500">S{clase.semana} — {clase.titulo}</span>}
          {recurso.descripcion && <span className="text-xs text-zinc-400 truncate">{recurso.descripcion}</span>}
        </div>
      </div>
      {recurso.tipo && (
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", TIPO_COLOR[recurso.tipo] ?? "bg-zinc-100 text-zinc-500")}>
          {recurso.tipo}
        </span>
      )}
      {recurso.url && (
        <a href={recurso.url} target="_blank" rel="noreferrer"
          className="text-zinc-300 hover:text-blue-500 transition-colors shrink-0">
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      <button onClick={() => setEditing(true)}
        className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 opacity-0 group-hover:opacity-100 transition-all shrink-0">
        <Edit2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function RecursosManager({ initialRecursos, clases }: {
  initialRecursos: RecursoRecord[];
  clases: ClaseFull[];
}) {
  const [recursos, setRecursos] = useState(initialRecursos);

  function updateRecurso(updated: RecursoRecord) {
    setRecursos((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Recursos</h1>
          <p className="text-sm text-zinc-500 mt-1">{recursos.length} recursos en total</p>
        </div>
        <NuevoRecursoForm clases={clases} onCreated={(r) => setRecursos((prev) => [...prev, r])} />
      </div>

      {recursos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-zinc-400">
          <Link2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
          No hay recursos todavía. Crea el primero arriba.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          {recursos
            .sort((a, b) => {
              const ca = clases.find((c) => c.id === (a.clase as string[])?.[0])?.semana ?? 99;
              const cb = clases.find((c) => c.id === (b.clase as string[])?.[0])?.semana ?? 99;
              return ca - cb;
            })
            .map((r) => (
              <RecursoRow key={r.id} recurso={r} clases={clases} onChange={updateRecurso} />
            ))}
        </div>
      )}
    </div>
  );
}

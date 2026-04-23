"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus, ChevronDown, ChevronUp, Target, FileText, Link2,
  Video, Calendar, Loader2, ExternalLink, Edit2, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ClaseRecord, MisionRecord, RecursoRecord } from "@/lib/airtable";

type ClaseWithContent = ClaseRecord & { misionesData: MisionRecord[]; recursosData: RecursoRecord[] };

const STATUS_CLASE = ["Próxima", "En vivo", "Grabada"] as const;
const STATUS_MISION = ["Próxima", "Activa", "Cerrada"] as const;
const TIPOS_RECURSO = ["PDF", "Video", "Artículo", "Template", "Herramienta", "Otro"] as const;

// ─── Inline editable field ────────────────────────────────────────────────────

function InlineEdit({ value, onSave, placeholder, multiline }: {
  value?: string; onSave: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (!editing) {
    return (
      <button onClick={() => { setDraft(value ?? ""); setEditing(true); }}
        className="text-left hover:bg-zinc-50 rounded px-1 -mx-1 group flex items-start gap-1 w-full">
        <span className={value ? "" : "text-zinc-300 italic"}>{value || placeholder || "—"}</span>
        <Edit2 className="h-3 w-3 text-zinc-300 group-hover:text-zinc-500 shrink-0 mt-0.5" />
      </button>
    );
  }

  return (
    <div className="flex items-start gap-1">
      {multiline ? (
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus
          className="flex-1 text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
      ) : (
        <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus
          className="flex-1 text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
      )}
      <button onClick={() => { onSave(draft); setEditing(false); }} className="p-1 text-green-600 hover:bg-green-50 rounded">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={() => setEditing(false)} className="p-1 text-zinc-400 hover:bg-zinc-100 rounded">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  "Próxima": "bg-zinc-100 text-zinc-600",
  "En vivo":  "bg-red-100 text-red-600",
  "Grabada":  "bg-green-100 text-green-700",
  "Activa":   "bg-amber-100 text-amber-700",
  "Cerrada":  "bg-zinc-100 text-zinc-400",
};

// ─── New Clase form ────────────────────────────────────────────────────────────

function NuevaClaseForm({ onCreated }: { onCreated: (clase: ClaseWithContent) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titulo: "", semana: "", fecha: "", url_live: "", status: "Próxima" });

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
          fecha: form.fecha || undefined,
        }),
      });
      const { id } = await res.json();
      onCreated({ id, ...form, semana: Number(form.semana) || 0, misionesData: [], recursosData: [] } as ClaseWithContent);
      setForm({ titulo: "", semana: "", fecha: "", url_live: "", status: "Próxima" });
      setOpen(false);
      toast.success("Clase creada");
    } catch { toast.error("Error al crear clase"); }
    finally { setSaving(false); }
  }

  if (!open) return (
    <Button onClick={() => setOpen(true)} className="gap-2">
      <Plus className="h-4 w-4" /> Nueva clase
    </Button>
  );

  return (
    <div className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4">
      <h3 className="font-semibold text-zinc-800">Nueva clase</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input placeholder="Título de la clase *" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        </div>
        <Input placeholder="Semana #" type="number" value={form.semana} onChange={(e) => setForm({ ...form, semana: e.target.value })} />
        <Input placeholder="Fecha y hora" type="datetime-local" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
        <Input placeholder="URL Zoom / Meet" value={form.url_live} onChange={(e) => setForm({ ...form, url_live: e.target.value })} />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {STATUS_CLASE.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear clase"}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

// ─── Nueva Mision form ─────────────────────────────────────────────────────────

function NuevaMisionForm({ claseId, semana, claseFecha, onCreated }: {
  claseId: string; semana?: number; claseFecha?: string; onCreated: (m: MisionRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [diasOffset, setDiasOffset] = useState(5);

  function calcFecha(dias: number) {
    if (!claseFecha) return "";
    const d = new Date(claseFecha);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 16);
  }

  const [form, setForm] = useState({ titulo: "", descripcion: "", instrucciones: "", fecha_limite: calcFecha(5), status: "Próxima" });

  function onDiasChange(dias: number) {
    setDiasOffset(dias);
    setForm((f) => ({ ...f, fecha_limite: calcFecha(dias) }));
  }

  async function submit() {
    if (!form.titulo) return toast.error("El título es obligatorio");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/misiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dias_offset: diasOffset, semana, claseId }),
      });
      const { id } = await res.json();
      onCreated({ id, ...form, semana, clase: [claseId] });
      setForm({ titulo: "", descripcion: "", instrucciones: "", fecha_limite: "", status: "Próxima" });
      setOpen(false);
      toast.success("Misión creada");
    } catch { toast.error("Error al crear misión"); }
    finally { setSaving(false); }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 font-medium px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors">
      <Plus className="h-3.5 w-3.5" /> Agregar misión
    </button>
  );

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 mt-2">
      <p className="text-xs font-semibold text-amber-800">Nueva misión</p>
      <Input placeholder="Título *" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="text-sm" />
      <Input placeholder="Descripción breve" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="text-sm" />
      <textarea placeholder="Instrucciones detalladas" value={form.instrucciones} rows={3}
        onChange={(e) => setForm({ ...form, instrucciones: e.target.value })}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-xs text-zinc-400">Días después de la clase</p>
          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={60} value={diasOffset}
              onChange={(e) => onDiasChange(Number(e.target.value))}
              className="text-sm text-center w-20" />
            <span className="text-xs text-zinc-400">
              {form.fecha_limite
                ? `→ ${new Date(form.fecha_limite).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`
                : "días"}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-zinc-400">Status</p>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
            {STATUS_MISION.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear misión"}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} className="text-xs h-8">Cancelar</Button>
      </div>
    </div>
  );
}

// ─── Nuevo Recurso form ────────────────────────────────────────────────────────

function NuevoRecursoForm({ claseId, claseFecha, onCreated }: {
  claseId: string; claseFecha?: string; onCreated: (r: RecursoRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Recursos disponibles el mismo día de la clase por defecto
  const defaultFechaDisponible = claseFecha
    ? new Date(claseFecha).toISOString().slice(0, 16)
    : "";

  const [form, setForm] = useState({ titulo: "", url: "", tipo: "PDF", descripcion: "", fecha_disponible: defaultFechaDisponible });

  async function submit() {
    if (!form.titulo) return toast.error("El título es obligatorio");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/recursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, claseId }),
      });
      const { id } = await res.json();
      onCreated({ id, ...form, clase: [claseId] } as RecursoRecord);
      setForm({ titulo: "", url: "", tipo: "PDF", descripcion: "" });
      setOpen(false);
      toast.success("Recurso agregado");
    } catch { toast.error("Error al crear recurso"); }
    finally { setSaving(false); }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 font-medium px-2 py-1 rounded-lg hover:bg-zinc-100 transition-colors">
      <Plus className="h-3.5 w-3.5" /> Agregar recurso
    </button>
  );

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 mt-2">
      <p className="text-xs font-semibold text-zinc-700">Nuevo recurso</p>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Título *" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="text-sm" />
        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {TIPOS_RECURSO.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <Input placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="text-sm" />
      <Input placeholder="Descripción breve" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="text-sm" />
      <div className="space-y-1">
        <p className="text-xs text-zinc-500 font-medium">Disponible desde</p>
        <Input type="datetime-local" value={form.fecha_disponible}
          onChange={(e) => setForm({ ...form, fecha_disponible: e.target.value })} className="text-sm" />
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving} className="bg-zinc-700 hover:bg-zinc-800 text-white text-xs h-8">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Agregar"}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} className="text-xs h-8">Cancelar</Button>
      </div>
    </div>
  );
}

// ─── Clase Card (admin) ────────────────────────────────────────────────────────

function ClaseAdminCard({ clase, onChange }: {
  clase: ClaseWithContent;
  onChange: (updated: ClaseWithContent) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState(false);

  async function patchClase(field: string, value: unknown) {
    setSaving(true);
    try {
      await fetch("/api/admin/clases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clase.id, [field]: value }),
      });
      onChange({ ...clase, [field]: value });
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-50 transition-colors"
        onClick={() => setExpanded((e) => !e)}>
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-blue-600">{clase.semana ?? "–"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-800 truncate">{clase.titulo ?? "Sin título"}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {clase.fecha && (
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(clase.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLOR[clase.status ?? "Próxima"])}>
              {clase.status ?? "Próxima"}
            </span>
            <span className="text-xs text-zinc-400">{clase.misionesData.length} misión · {clase.recursosData.length} recursos</span>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={`/portal/clases/${clase.id}`} target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-blue-600 transition-colors">
            <ExternalLink className="h-4 w-4" />
          </a>
          {expanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-100 divide-y divide-zinc-100">
          {/* Edit fields */}
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <p className="text-xs text-zinc-400 font-medium">Título</p>
              <InlineEdit value={clase.titulo} onSave={(v) => patchClase("titulo", v)} placeholder="Título de la clase" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-400 font-medium">Semana</p>
              <InlineEdit value={String(clase.semana ?? "")} onSave={(v) => patchClase("semana", Number(v))} placeholder="#" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-400 font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> Fecha y hora</p>
              <input
                type="datetime-local"
                defaultValue={clase.fecha ? clase.fecha.slice(0, 16) : ""}
                onBlur={(e) => { if (e.target.value) patchClase("fecha", e.target.value); }}
                className="text-sm border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-400 font-medium">Status</p>
              <select value={clase.status ?? "Próxima"} onChange={(e) => patchClase("status", e.target.value)}
                className="text-sm border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400">
                {STATUS_CLASE.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-400 font-medium flex items-center gap-1"><Video className="h-3 w-3" /> URL Live</p>
              <InlineEdit value={clase.url_live} onSave={(v) => patchClase("url_live", v)} placeholder="https://zoom.us/..." />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-400 font-medium flex items-center gap-1"><Video className="h-3 w-3" /> URL Grabación</p>
              <InlineEdit value={clase.url_grabacion} onSave={(v) => patchClase("url_grabacion", v)} placeholder="https://youtube.com/..." />
            </div>
            <div className="col-span-2 space-y-1">
              <p className="text-xs text-zinc-400 font-medium">Descripción</p>
              <InlineEdit value={clase.descripcion} onSave={(v) => patchClase("descripcion", v)} placeholder="Descripción de la clase" multiline />
            </div>
          </div>

          {/* Misiones */}
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-600 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-amber-500" /> Misiones
              </p>
            </div>
            {clase.misionesData.map((m) => (
              <div key={m.id} className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl">
                <Target className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{m.titulo}</p>
                  {m.fecha_limite && (
                    <p className="text-xs text-zinc-400">Límite: {new Date(m.fecha_limite).toLocaleDateString("es-MX")}</p>
                  )}
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", STATUS_COLOR[m.status ?? "Próxima"])}>
                  {m.status ?? "Próxima"}
                </span>
              </div>
            ))}
            <NuevaMisionForm
              claseId={clase.id!}
              semana={clase.semana}
              claseFecha={clase.fecha}
              onCreated={(m) => onChange({ ...clase, misionesData: [...clase.misionesData, m] })}
            />
          </div>

          {/* Recursos */}
          <div className="p-4 space-y-2">
            <p className="text-xs font-semibold text-zinc-600 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-zinc-400" /> Recursos
            </p>
            {clase.recursosData.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2.5 bg-zinc-50 rounded-xl">
                <Link2 className="h-4 w-4 text-zinc-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-700 truncate">{r.titulo}</p>
                  {r.url && <p className="text-xs text-zinc-400 truncate">{r.url}</p>}
                </div>
                {r.tipo && <span className="text-xs text-zinc-400 shrink-0">{r.tipo}</span>}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-600">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
            <NuevoRecursoForm
              claseId={clase.id!}
              claseFecha={clase.fecha}
              onCreated={(r) => onChange({ ...clase, recursosData: [...clase.recursosData, r] })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main manager ─────────────────────────────────────────────────────────────

export function ClasesManager({ initialClases }: { initialClases: ClaseWithContent[] }) {
  const [clases, setClases] = useState(initialClases);

  function updateClase(updated: ClaseWithContent) {
    setClases((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  }

  return (
    <div className="space-y-4">
      <NuevaClaseForm onCreated={(c) => setClases((prev) => [...prev, c])} />

      {clases.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-zinc-400">
          No hay clases todavía. Crea la primera arriba.
        </div>
      )}

      <div className="space-y-3">
        {clases
          .sort((a, b) => (a.semana ?? 99) - (b.semana ?? 99))
          .map((clase) => (
            <ClaseAdminCard key={clase.id} clase={clase} onChange={updateClase} />
          ))}
      </div>
    </div>
  );
}

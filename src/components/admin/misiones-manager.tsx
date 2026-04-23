"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Target, Clock, AlertCircle, CheckCircle2, Circle, Edit2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MisionRecord, ClaseRecord, RecursoRecord } from "@/lib/airtable";

type ClaseFull = ClaseRecord & { misionesData: MisionRecord[]; recursosData: RecursoRecord[] };

const STATUS_MISION = ["Próxima", "Activa", "Cerrada"] as const;
const STATUS_COLOR: Record<string, string> = {
  "Próxima": "bg-zinc-100 text-zinc-500",
  "Activa":  "bg-amber-100 text-amber-700",
  "Cerrada": "bg-green-100 text-green-700",
};

function formatFecha(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function daysLeft(iso?: string) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function ClaseSelector({ clases, value, onChange }: {
  clases: ClaseFull[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-full">
      <option value="">Sin clase asignada</option>
      {clases.sort((a, b) => (a.semana ?? 99) - (b.semana ?? 99)).map((c) => (
        <option key={c.id} value={c.id!}>
          S{c.semana} — {c.titulo}
        </option>
      ))}
    </select>
  );
}

function NuevaMisionForm({ clases, onCreated }: {
  clases: ClaseFull[];
  onCreated: (m: MisionRecord & { _claseId?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [claseId, setClaseId] = useState("");
  const [diasOffset, setDiasOffset] = useState(5);
  const [form, setForm] = useState({
    titulo: "", descripcion: "", instrucciones: "", fecha_limite: "", status: "Próxima",
  });

  function calcFechaLimite(id: string, dias: number) {
    const clase = clases.find((c) => c.id === id);
    if (clase?.fecha) {
      const d = new Date(clase.fecha);
      d.setDate(d.getDate() + dias);
      return d.toISOString().slice(0, 16);
    }
    return "";
  }

  function onClaseChange(id: string) {
    setClaseId(id);
    if (id) setForm((f) => ({ ...f, fecha_limite: calcFechaLimite(id, diasOffset) }));
  }

  function onDiasChange(dias: number) {
    setDiasOffset(dias);
    if (claseId) setForm((f) => ({ ...f, fecha_limite: calcFechaLimite(claseId, dias) }));
  }

  async function submit() {
    if (!form.titulo) return toast.error("El título es obligatorio");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/misiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fecha_limite: form.fecha_limite || undefined,
          dias_offset: diasOffset,
          claseId: claseId || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      onCreated({ id, ...form, clase: claseId ? [claseId] : undefined, _claseId: claseId });
      setForm({ titulo: "", descripcion: "", instrucciones: "", fecha_limite: "", status: "Próxima" });
      setClaseId("");
      setOpen(false);
      toast.success("Misión creada");
    } catch { toast.error("Error al crear misión"); }
    finally { setSaving(false); }
  }

  if (!open) return (
    <Button onClick={() => setOpen(true)} className="gap-2">
      <Plus className="h-4 w-4" /> Nueva misión
    </Button>
  );

  return (
    <div className="bg-white rounded-2xl border border-amber-200 p-5 space-y-4">
      <h3 className="font-semibold text-zinc-800">Nueva misión</h3>
      <ClaseSelector clases={clases} value={claseId} onChange={onClaseChange} />
      <Input placeholder="Título *" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
      <Input placeholder="Descripción breve" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
      <textarea placeholder="Instrucciones detalladas" value={form.instrucciones} rows={3}
        onChange={(e) => setForm({ ...form, instrucciones: e.target.value })}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 font-medium">Días después de la clase</p>
          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={60} value={diasOffset}
              onChange={(e) => onDiasChange(Number(e.target.value))}
              className="w-24 text-center" />
            <span className="text-xs text-zinc-400">
              {form.fecha_limite
                ? `→ ${new Date(form.fecha_limite).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`
                : "días"}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 font-medium">Status</p>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
            {STATUS_MISION.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear misión"}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

function MisionRow({ mision, clases, onChange }: {
  mision: MisionRecord;
  clases: ClaseFull[];
  onChange: (updated: MisionRecord) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    titulo: mision.titulo ?? "",
    descripcion: mision.descripcion ?? "",
    instrucciones: mision.instrucciones ?? "",
    fecha_limite: mision.fecha_limite ? mision.fecha_limite.slice(0, 16) : "",
    status: mision.status ?? "Próxima",
    claseId: (mision.clase as string[] | undefined)?.[0] ?? "",
  });

  const days = daysLeft(mision.fecha_limite);
  const isActiva = mision.status === "Activa";
  const isCerrada = mision.status === "Cerrada";
  const claseId = (mision.clase as string[] | undefined)?.[0];
  const clase = claseId ? clases.find((c) => c.id === claseId) : null;

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/admin/misiones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: mision.id,
          titulo: draft.titulo,
          descripcion: draft.descripcion,
          instrucciones: draft.instrucciones,
          fecha_limite: draft.fecha_limite || undefined,
          status: draft.status,
          claseId: draft.claseId || undefined,
        }),
      });
      onChange({
        ...mision,
        titulo: draft.titulo,
        descripcion: draft.descripcion,
        instrucciones: draft.instrucciones,
        fecha_limite: draft.fecha_limite || undefined,
        status: draft.status as MisionRecord["status"],
        clase: draft.claseId ? [draft.claseId] : undefined,
      });
      setEditing(false);
      toast.success("Guardado");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  if (editing) {
    return (
      <div className="p-4 bg-amber-50/40 border-b border-zinc-100 space-y-3">
        <ClaseSelector clases={clases} value={draft.claseId} onChange={(v) => setDraft({ ...draft, claseId: v })} />
        <Input value={draft.titulo} onChange={(e) => setDraft({ ...draft, titulo: e.target.value })} placeholder="Título" />
        <Input value={draft.descripcion} onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })} placeholder="Descripción" />
        <textarea value={draft.instrucciones} rows={3} onChange={(e) => setDraft({ ...draft, instrucciones: e.target.value })}
          placeholder="Instrucciones"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
        <div className="grid grid-cols-2 gap-3">
          <Input type="datetime-local" value={draft.fecha_limite}
            onChange={(e) => setDraft({ ...draft, fecha_limite: e.target.value })} />
          <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
            {STATUS_MISION.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8">
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
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors group border-b border-zinc-100">
      <div className="mt-0.5 shrink-0">
        {isCerrada ? <CheckCircle2 className="h-4 w-4 text-green-500" />
          : isActiva ? <AlertCircle className="h-4 w-4 text-amber-500" />
          : <Circle className="h-4 w-4 text-zinc-300" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isCerrada ? "line-through text-zinc-400" : "text-zinc-800"}`}>
          {mision.titulo}
        </p>
        {mision.descripcion && (
          <p className="text-xs text-zinc-400 mt-0.5 truncate">{mision.descripcion}</p>
        )}
        {clase && (
          <p className="text-xs text-blue-500 mt-0.5">
            S{clase.semana} — {clase.titulo}
            {mision.dias_offset !== undefined && (
              <span className="text-zinc-400 ml-1">(+{mision.dias_offset}d)</span>
            )}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {mision.fecha_limite && (
          <span className={cn("flex items-center gap-1 text-xs font-medium",
            !isCerrada && days !== null && days <= 2 ? "text-red-600" :
            !isCerrada && days !== null && days <= 5 ? "text-amber-600" : "text-zinc-400")}>
            <Clock className="h-3 w-3" />
            {isCerrada ? formatFecha(mision.fecha_limite) :
              days === null ? "" : days < 0 ? "Vencida" :
              days === 0 ? "Hoy" : days === 1 ? "Mañana" : `${days}d — ${formatFecha(mision.fecha_limite)}`}
          </span>
        )}
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLOR[mision.status ?? "Próxima"])}>
          {mision.status ?? "Próxima"}
        </span>
        <button onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 opacity-0 group-hover:opacity-100 transition-all">
          <Edit2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function MisionesManager({ initialMisiones, clases }: {
  initialMisiones: MisionRecord[];
  clases: ClaseFull[];
}) {
  const [misiones, setMisiones] = useState(initialMisiones);

  const activas  = misiones.filter((m) => m.status === "Activa");
  const proximas = misiones.filter((m) => m.status === "Próxima" || !m.status);
  const cerradas = misiones.filter((m) => m.status === "Cerrada");

  function updateMision(updated: MisionRecord) {
    setMisiones((prev) => prev.map((m) => m.id === updated.id ? updated : m));
  }

  function Section({ title, items, icon }: { title: string; items: MisionRecord[]; icon: React.ReactNode }) {
    if (items.length === 0) return null;
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-zinc-700">{title}</span>
          <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div>
          {items.map((m) => (
            <MisionRow key={m.id} mision={m} clases={clases} onChange={updateMision} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Misiones</h1>
          <p className="text-sm text-zinc-500 mt-1">{misiones.length} misiones en total</p>
        </div>
        <NuevaMisionForm
          clases={clases}
          onCreated={(m) => setMisiones((prev) => [...prev, m])}
        />
      </div>

      <Section title="Activas" items={activas} icon={<AlertCircle className="h-4 w-4 text-amber-500" />} />
      <Section title="Próximas" items={proximas} icon={<Circle className="h-4 w-4 text-zinc-400" />} />
      <Section title="Cerradas" items={cerradas} icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} />

      {misiones.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-zinc-400">
          <Target className="h-8 w-8 mx-auto mb-3 opacity-30" />
          No hay misiones todavía. Crea la primera arriba.
        </div>
      )}
    </div>
  );
}

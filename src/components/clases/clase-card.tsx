"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Video,
  Calendar,
  BookOpen,
  Target,
  FileText,
  Link2,
  Wrench,
  ExternalLink,
  Clock,
  Edit2,
  Check,
  X,
  Loader2,
  Plus,
  Upload,
} from "lucide-react";

import { formatFecha, formatFechaCorta, toSantiagoInput, santiagoInputToISO } from "@/lib/timezone";
import { EnterMeetButton } from "@/components/portal/enter-meet-button";
import type { ClaseRecord, MisionRecord, RecursoRecord } from "@/lib/airtable";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClaseFull = ClaseRecord & {
  misionesData: MisionRecord[];
  recursosData: RecursoRecord[];
};

type Mode = "view" | "admin";

const STATUS_CLASE = ["Próxima", "En vivo", "Grabada"] as const;
const STATUS_MISION = ["Próxima", "Activa", "Cerrada"] as const;
const TIPOS_RECURSO = ["PDF", "Video", "Artículo", "Template", "Herramienta", "Otro"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Quita "Sx — " del título para mostrar al founder en modo view.
// En admin se conserva para mantener el orden visual.
function stripSemanaPrefix(titulo?: string): string | undefined {
  if (!titulo) return titulo;
  return titulo.replace(/^S\d+\s*[—–-]\s*/, "");
}

function daysLeft(iso?: string) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function TipoIcon({ tipo }: { tipo?: string }) {
  const t = tipo?.toLowerCase() ?? "";
  if (t.includes("pdf")) return <FileText className="h-3.5 w-3.5 text-red-500" />;
  if (t.includes("video")) return <Video className="h-3.5 w-3.5 text-blue-500" />;
  if (t.includes("template")) return <BookOpen className="h-3.5 w-3.5 text-purple-500" />;
  if (t.includes("herramienta")) return <Wrench className="h-3.5 w-3.5 text-orange-500" />;
  return <Link2 className="h-3.5 w-3.5 text-zinc-400" />;
}

// ─── Inline editable (text / textarea) ────────────────────────────────────────

function InlineText({
  value,
  onSave,
  placeholder,
  multiline,
  className,
  inputClassName,
}: {
  value?: string;
  onSave: (v: string) => Promise<void> | void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <span className={`inline-flex items-start gap-1 group ${className ?? ""}`}>
        <span className={value ? "" : "text-zinc-300 italic"}>{value || placeholder || "—"}</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDraft(value ?? "");
            setEditing(true);
          }}
          className="p-0.5 rounded hover:bg-zinc-100 text-zinc-300 hover:text-blue-600 transition-colors shrink-0"
          title="Editar"
        >
          <Edit2 className="h-3 w-3" />
        </button>
      </span>
    );
  }

  const sharedClass =
    inputClassName ??
    "text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400";

  return (
    <span className="inline-flex items-start gap-1" onClick={(e) => e.stopPropagation()}>
      {multiline ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          autoFocus
          className={`${sharedClass} resize-none w-full`}
        />
      ) : (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className={sharedClass}
        />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          save();
        }}
        disabled={saving}
        className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(false);
        }}
        className="p-1 text-zinc-400 hover:bg-zinc-100 rounded"
      >
        <X className="h-4 w-4" />
      </button>
    </span>
  );
}

// ─── Inline select ────────────────────────────────────────────────────────────

function InlineSelect<T extends string>({
  value,
  options,
  onSave,
}: {
  value?: string;
  options: readonly T[];
  onSave: (v: T) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setEditing(true);
        }}
        className="p-0.5 rounded hover:bg-zinc-100 text-zinc-300 hover:text-blue-600 transition-colors"
        title="Editar status"
      >
        <Edit2 className="h-3 w-3" />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <select
        autoFocus
        defaultValue={value ?? options[0]}
        disabled={saving}
        onChange={async (e) => {
          const v = e.target.value as T;
          setSaving(true);
          try {
            await onSave(v);
            setEditing(false);
          } finally {
            setSaving(false);
          }
        }}
        className="text-xs border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(false);
        }}
        className="p-0.5 text-zinc-400 hover:bg-zinc-100 rounded"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── Inline datetime ──────────────────────────────────────────────────────────

function InlineDate({
  value,
  onSave,
}: {
  value?: string;
  onSave: (iso: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setEditing(true);
        }}
        className="p-0.5 rounded hover:bg-zinc-100 text-zinc-300 hover:text-blue-600 transition-colors"
        title="Editar fecha"
      >
        <Edit2 className="h-3 w-3" />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        type="datetime-local"
        autoFocus
        defaultValue={toSantiagoInput(value)}
        disabled={saving}
        onBlur={async (e) => {
          if (!e.target.value) {
            setEditing(false);
            return;
          }
          setSaving(true);
          try {
            await onSave(santiagoInputToISO(e.target.value));
            setEditing(false);
          } finally {
            setSaving(false);
          }
        }}
        className="text-xs border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      {saving && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(false);
        }}
        className="p-0.5 text-zinc-400 hover:bg-zinc-100 rounded"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── Subir portada ────────────────────────────────────────────────────────────

function SubirPortadaButton({
  claseId,
  onUploaded,
}: {
  claseId: string;
  onUploaded: (url: string, thumbnails?: { large?: { url: string } }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("claseId", claseId);
      const res = await fetch("/api/admin/clases/portada", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error("Error al subir portada");
        return;
      }
      onUploaded(data.url, data.thumbnails);
      toast.success("Portada subida");
    } catch {
      toast.error("Error de red al subir");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          fileRef.current?.click();
        }}
        disabled={uploading}
        className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-lg border border-blue-200 transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        Subir portada
      </button>
    </>
  );
}

// ─── Nueva misión inline form ─────────────────────────────────────────────────

function NuevaMisionInline({
  claseId,
  semana,
  claseFecha,
  onCreated,
}: {
  claseId: string;
  semana?: number;
  claseFecha?: string;
  onCreated: (m: MisionRecord) => void;
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

  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    fecha_limite: calcFecha(5),
    status: "Próxima",
  });

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
      onCreated({ id, ...form, semana, clase: [claseId] } as MisionRecord);
      setForm({ titulo: "", descripcion: "", fecha_limite: "", status: "Próxima" });
      setOpen(false);
      toast.success("Misión creada");
    } catch {
      toast.error("Error al crear misión");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 font-medium px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors w-full justify-center border border-dashed border-amber-200"
      >
        <Plus className="h-3.5 w-3.5" /> Nueva misión
      </button>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-amber-800">Nueva misión</p>
      <input
        placeholder="Título *"
        value={form.titulo}
        onChange={(e) => setForm({ ...form, titulo: e.target.value })}
        className="w-full text-sm border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <input
        placeholder="Descripción breve"
        value={form.descripcion}
        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        className="w-full text-sm border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-xs text-zinc-400">Días después de la clase</p>
          <input
            type="number"
            min={0}
            max={60}
            value={diasOffset}
            onChange={(e) => onDiasChange(Number(e.target.value))}
            className="w-full text-sm border border-amber-200 rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-zinc-400">Status</p>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full rounded border border-amber-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {STATUS_MISION.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 rounded-lg disabled:opacity-50 flex items-center gap-1"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear misión"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border border-zinc-200 text-xs h-8 px-3 rounded-lg hover:bg-zinc-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Nuevo recurso inline form ────────────────────────────────────────────────

function NuevoRecursoInline({
  claseId,
  claseFecha,
  onCreated,
}: {
  claseId: string;
  claseFecha?: string;
  onCreated: (r: RecursoRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const defaultFechaDisponible = claseFecha ? new Date(claseFecha).toISOString().slice(0, 16) : "";

  const [form, setForm] = useState({
    titulo: "",
    url: "",
    tipo: "PDF",
    descripcion: "",
    fecha_disponible: defaultFechaDisponible,
  });

  async function submit() {
    if (!form.titulo) return toast.error("El título es obligatorio");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/recursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fecha_disponible: form.fecha_disponible ? santiagoInputToISO(form.fecha_disponible) : undefined,
          claseId,
        }),
      });
      const { id } = await res.json();
      onCreated({ id, ...form, clase: [claseId] } as RecursoRecord);
      setForm({ titulo: "", url: "", tipo: "PDF", descripcion: "", fecha_disponible: defaultFechaDisponible });
      setOpen(false);
      toast.success("Recurso agregado");
    } catch {
      toast.error("Error al crear recurso");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 font-medium px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors w-full justify-center border border-dashed border-zinc-200"
      >
        <Plus className="h-3.5 w-3.5" /> Nuevo recurso
      </button>
    );
  }

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-zinc-700">Nuevo recurso</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Título *"
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          className="text-sm border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          className="rounded border border-zinc-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TIPOS_RECURSO.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <input
        placeholder="URL"
        value={form.url}
        onChange={(e) => setForm({ ...form, url: e.target.value })}
        className="w-full text-sm border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <input
        placeholder="Descripción breve"
        value={form.descripcion}
        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        className="w-full text-sm border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <div className="space-y-1">
        <p className="text-xs text-zinc-500 font-medium">Disponible desde</p>
        <input
          type="datetime-local"
          value={form.fecha_disponible}
          onChange={(e) => setForm({ ...form, fecha_disponible: e.target.value })}
          className="w-full text-sm border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="bg-zinc-700 hover:bg-zinc-800 text-white text-xs h-8 px-3 rounded-lg disabled:opacity-50 flex items-center gap-1"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Agregar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border border-zinc-200 text-xs h-8 px-3 rounded-lg hover:bg-zinc-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Misión row (view + admin) ────────────────────────────────────────────────

function MisionRow({
  mision,
  mode,
  onUpdate,
}: {
  mision: MisionRecord;
  mode: Mode;
  onUpdate: (m: MisionRecord) => void;
}) {
  const days = daysLeft(mision.fecha_limite);
  const isActiva = mision.status === "Activa";
  const isCerrada = mision.status === "Cerrada";

  async function patch(field: string, value: unknown) {
    try {
      await fetch("/api/admin/misiones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mision.id, [field]: value }),
      });
      onUpdate({ ...mision, [field]: value } as MisionRecord);
    } catch {
      toast.error("Error al guardar");
    }
  }

  return (
    <div
      className={`border-t px-5 py-3 flex items-start gap-3
        ${isActiva ? "bg-amber-50/60 border-amber-100" : "bg-zinc-50/50 border-zinc-100"}`}
    >
      <Target
        className={`h-4 w-4 mt-0.5 shrink-0 ${isActiva ? "text-amber-500" : "text-zinc-300"}`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium leading-tight ${isCerrada ? "line-through text-zinc-400" : "text-zinc-700"}`}
        >
          {mode === "admin" ? (
            <InlineText
              value={mision.titulo}
              onSave={(v) => patch("titulo", v)}
              placeholder="Título de la misión"
            />
          ) : (
            mision.titulo
          )}
        </p>
        {(mision.descripcion || mode === "admin") && (
          <p className="text-xs text-zinc-400 mt-0.5">
            {mode === "admin" ? (
              <InlineText
                value={mision.descripcion}
                onSave={(v) => patch("descripcion", v)}
                placeholder="Sin descripción"
              />
            ) : (
              mision.descripcion
            )}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {mision.fecha_limite && !isCerrada && (
          <span
            className={`flex items-center gap-1 text-xs font-medium
              ${days !== null && days <= 2 ? "text-red-600" : days !== null && days <= 5 ? "text-amber-600" : "text-zinc-400"}`}
          >
            <Clock className="h-3 w-3" />
            {days === null
              ? ""
              : days < 0
                ? "Vencida"
                : days === 0
                  ? "Hoy"
                  : days === 1
                    ? "Mañana"
                    : `${days}d — ${formatFechaCorta(mision.fecha_limite)}`}
          </span>
        )}
        {mode === "admin" && (
          <InlineDate
            value={mision.fecha_limite}
            onSave={(iso) => patch("fecha_limite", iso)}
          />
        )}
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium
            ${isCerrada ? "bg-zinc-100 text-zinc-400" : isActiva ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"}`}
        >
          {mision.status ?? "Próxima"}
        </span>
        {mode === "admin" && (
          <InlineSelect
            value={mision.status}
            options={STATUS_MISION}
            onSave={(v) => patch("status", v)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Recurso row (view + admin) ───────────────────────────────────────────────

function RecursoLink({
  recurso,
  mode,
  onUpdate,
}: {
  recurso: RecursoRecord;
  mode: Mode;
  onUpdate: (r: RecursoRecord) => void;
}) {
  async function patch(field: string, value: unknown) {
    try {
      await fetch("/api/admin/recursos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recurso.id, [field]: value }),
      });
      onUpdate({ ...recurso, [field]: value } as RecursoRecord);
    } catch {
      toast.error("Error al guardar");
    }
  }

  if (mode === "view") {
    return (
      <a
        href={recurso.url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 transition-colors"
      >
        <TipoIcon tipo={recurso.tipo} />
        <span className="truncate max-w-[140px]">{recurso.titulo}</span>
        <ExternalLink className="h-2.5 w-2.5 opacity-50" />
      </a>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1">
      <TipoIcon tipo={recurso.tipo} />
      <InlineText
        value={recurso.titulo}
        onSave={(v) => patch("titulo", v)}
        placeholder="Título"
        className="max-w-[140px]"
      />
      {recurso.url && (
        <a
          href={recurso.url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 hover:text-blue-600"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
      <InlineText
        value={recurso.url}
        onSave={(v) => patch("url", v)}
        placeholder="URL"
      />
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({
  clase,
  mode,
  onSave,
}: {
  clase: ClaseFull;
  mode: Mode;
  onSave: (v: string) => Promise<void> | void;
}) {
  const isGrabada = clase.status === "Grabada";
  const isLive = clase.status === "En vivo";
  const isProxima = !isGrabada && !isLive;

  return (
    <span className="inline-flex items-center gap-1">
      {isLive && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse">
          🔴 En vivo
        </span>
      )}
      {isGrabada && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          Grabada
        </span>
      )}
      {isProxima && (
        <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
          Próxima
        </span>
      )}
      {mode === "admin" && (
        <InlineSelect value={clase.status} options={STATUS_CLASE} onSave={onSave} />
      )}
    </span>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function ClaseCard({
  clase: claseProp,
  mode,
  onChange,
}: {
  clase: ClaseFull;
  mode: Mode;
  onChange?: (clase: ClaseFull) => void;
}) {
  // Estado local para reflejar ediciones inmediatamente en admin
  const [clase, setClase] = useState<ClaseFull>(claseProp);

  function update(next: ClaseFull) {
    setClase(next);
    onChange?.(next);
  }

  const isGrabada = clase.status === "Grabada";
  const isLive = clase.status === "En vivo";

  async function patchClase(field: string, value: unknown) {
    try {
      await fetch("/api/admin/clases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clase.id, [field]: value }),
      });
      update({ ...clase, [field]: value } as ClaseFull);
    } catch {
      toast.error("Error al guardar");
    }
  }

  // Calcular "ahora" una sola vez al montar (estable a lo largo de re-renders).
  // El initializer de useState no se considera "during render" para fines de pureza
  // y evita inestabilidad entre renders. La lista de recursos se deriva de eso.
  const [ahoraTs] = useState<number>(() => Date.now());
  const recursosVisibles = (() => {
    if (mode === "admin") return clase.recursosData;
    const clasePaso =
      isGrabada || (clase.fecha ? new Date(clase.fecha).getTime() <= ahoraTs : false);
    if (!clasePaso) return [] as RecursoRecord[];
    return clase.recursosData.filter(
      (r) => !r.fecha_disponible || new Date(r.fecha_disponible).getTime() <= ahoraTs,
    );
  })();

  // El wrapper del header: en view es un Link al detalle; en admin es un div sin Link
  // (igualmente cada parte editable detiene la propagación).
  const HeaderWrap = mode === "view" ? Link : "div";
  const headerWrapProps =
    mode === "view"
      ? {
          href: `/portal/clases/${clase.id}`,
          className:
            "flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/70 transition-colors group",
        }
      : {
          className: "flex items-center gap-4 px-5 py-4 group",
        };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      {/* Main row */}
      {/* @ts-expect-error union of intrinsic + Link element */}
      <HeaderWrap {...headerWrapProps}>
        {/* Portada o número */}
        {clase.Portada?.[0] ? (
          <div className="w-16 h-10 rounded-xl overflow-hidden shrink-0 bg-zinc-100 relative">
            <Image
              src={clase.Portada[0].thumbnails?.large?.url ?? clase.Portada[0].url}
              alt={clase.titulo ?? ""}
              width={64}
              height={40}
              className="w-full h-full object-cover"
              unoptimized
            />
            {mode === "admin" && clase.id && (
              <div
                className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <SubirPortadaButton
                  claseId={clase.id}
                  onUploaded={(url, thumbnails) =>
                    update({
                      ...clase,
                      Portada: [{ url, thumbnails: thumbnails as { large?: { url: string } } | undefined }],
                    })
                  }
                />
              </div>
            )}
          </div>
        ) : (
          <div className="relative shrink-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
                ${isGrabada ? "bg-green-50 text-green-700" : isLive ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
            >
              {clase.titulo?.match(/^S(\d+)/)?.[1] ?? clase.semana ?? "–"}
            </div>
            {mode === "admin" && clase.id && (
              <div
                className="absolute -top-2 -left-2"
                onClick={(e) => e.stopPropagation()}
              >
                <SubirPortadaButton
                  claseId={clase.id}
                  onUploaded={(url, thumbnails) =>
                    update({
                      ...clase,
                      Portada: [{ url, thumbnails: thumbnails as { large?: { url: string } } | undefined }],
                    })
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Title + date */}
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-zinc-800 ${mode === "view" ? "group-hover:text-blue-600" : ""} transition-colors leading-tight`}
          >
            {mode === "admin" ? (
              <InlineText
                value={clase.titulo}
                onSave={(v) => patchClase("titulo", v)}
                placeholder="Clase sin título"
              />
            ) : (
              stripSemanaPrefix(clase.titulo) ?? "Clase sin título"
            )}
          </p>
          <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1 flex-wrap">
            <Calendar className="h-3 w-3 shrink-0" />
            {clase.fecha ? (
              <span>{formatFecha(clase.fecha)}</span>
            ) : mode === "admin" ? (
              <span className="text-zinc-300 italic">Sin fecha</span>
            ) : null}
            {mode === "admin" && (
              <InlineDate
                value={clase.fecha}
                onSave={(iso) => patchClase("fecha", iso)}
              />
            )}
          </div>
        </div>

        {/* Status + action */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill clase={clase} mode={mode} onSave={(v) => patchClase("status", v)} />

          {isLive && clase.url_live && (
            <span onClick={(e) => e.stopPropagation()}>
              <EnterMeetButton claseId={clase.id!} meetUrl={clase.url_live} label="Entrar" />
            </span>
          )}
          {isGrabada && clase.url_grabacion && (
            <a
              href={clase.url_grabacion}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Video className="h-3 w-3" /> Ver
            </a>
          )}

          {mode === "admin" && (
            <a
              href={`/portal/clases/${clase.id}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-blue-600 transition-colors"
              title="Ver en portal"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </HeaderWrap>

      {/* Admin: extra fields (URLs + descripción) */}
      {mode === "admin" && (
        <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Video className="h-3 w-3 text-zinc-400 shrink-0" />
            <span className="text-zinc-400 font-medium">Streaming founders:</span>
            <InlineText
              value={clase.url_live}
              onSave={(v) => patchClase("url_live", v)}
              placeholder="https://streamyard.com/watch/..."
              className="truncate max-w-[260px]"
            />
            {clase.url_live && (
              <a
                href={clase.url_live}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:text-blue-700"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Video className="h-3 w-3 text-zinc-400 shrink-0" />
            <span className="text-zinc-400 font-medium">Streaming equipo:</span>
            <InlineText
              value={clase.url_live_team}
              onSave={(v) => patchClase("url_live_team", v)}
              placeholder="https://streamyard.com/watch/..."
              className="truncate max-w-[260px]"
            />
            {clase.url_live_team && (
              <a
                href={clase.url_live_team}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:text-blue-700"
                title="Ver streaming equipo"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <Video className="h-3 w-3 text-zinc-400 shrink-0" />
            <span className="text-zinc-400 font-medium">Grabación:</span>
            <InlineText
              value={clase.url_grabacion}
              onSave={(v) => patchClase("url_grabacion", v)}
              placeholder="https://youtube.com/..."
              className="truncate max-w-[520px]"
            />
            {clase.url_grabacion && (
              <a
                href={clase.url_grabacion}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:text-blue-700"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="col-span-2 flex items-start gap-2">
            <FileText className="h-3 w-3 text-zinc-400 shrink-0 mt-0.5" />
            <span className="text-zinc-400 font-medium shrink-0">Descripción:</span>
            <span className="flex-1 text-zinc-600">
              <InlineText
                value={clase.descripcion}
                onSave={(v) => patchClase("descripcion", v)}
                placeholder="Sin descripción"
                multiline
              />
            </span>
          </div>
        </div>
      )}

      {/* Misiones inline. En view solo mostramos las Activas (las Próxima/Cerrada
          se ocultan al founder para no llenar la card de items inactivos). */}
      {clase.misionesData
        .filter((m) => mode === "admin" || m.status === "Activa")
        .map((mision) => (
          <MisionRow
            key={mision.id}
            mision={mision}
            mode={mode}
            onUpdate={(m) =>
              update({
                ...clase,
                misionesData: clase.misionesData.map((x) => (x.id === m.id ? m : x)),
              })
            }
          />
        ))}

      {mode === "admin" && clase.id && (
        <div className="border-t border-amber-100 bg-amber-50/30 px-5 py-3">
          <NuevaMisionInline
            claseId={clase.id}
            semana={clase.semana}
            claseFecha={clase.fecha}
            onCreated={(m) =>
              update({ ...clase, misionesData: [...clase.misionesData, m] })
            }
          />
        </div>
      )}

      {/* Recursos inline */}
      {recursosVisibles.length > 0 && (
        <div className="border-t border-zinc-100 px-5 py-2.5 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-zinc-400 font-medium">Recursos:</span>
          {recursosVisibles.map((r) => (
            <RecursoLink
              key={r.id}
              recurso={r}
              mode={mode}
              onUpdate={(updated) =>
                update({
                  ...clase,
                  recursosData: clase.recursosData.map((x) =>
                    x.id === updated.id ? updated : x,
                  ),
                })
              }
            />
          ))}
        </div>
      )}

      {mode === "admin" && clase.id && (
        <div className="border-t border-zinc-100 bg-zinc-50/40 px-5 py-3">
          <NuevoRecursoInline
            claseId={clase.id}
            claseFecha={clase.fecha}
            onCreated={(r) =>
              update({ ...clase, recursosData: [...clase.recursosData, r] })
            }
          />
        </div>
      )}
    </div>
  );
}

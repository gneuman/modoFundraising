"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Mail,
  Zap,
  Save,
  Plus,
  Trash2,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  CreditCard,
  UserCheck,
  UserX,
  Bell,
  XCircle,
  LogIn,
  MessageSquare,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Bold,
  Italic,
  Link,
  List,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  EmailTemplate,
  AutomationRule,
  TriggerEvent,
} from "@/lib/airtable";

// ─── Metadata por trigger ─────────────────────────────────────────────────────

const TRIGGER_META: Record<
  TriggerEvent,
  {
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    dot: string;
  }
> = {
  checkout_completed: {
    label: "Pago inicial recibido",
    description: "Alguien pagó la primera cuota y se unió al programa.",
    icon: <CreditCard className="h-4 w-4" />,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  invoice_paid_cuota2: {
    label: "Cuota 2 pagada",
    description: "El segundo pago fue procesado correctamente.",
    icon: <CreditCard className="h-4 w-4" />,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  invoice_paid_cuota3: {
    label: "Cuota 3 pagada",
    description: "El tercer y último pago fue procesado.",
    icon: <CreditCard className="h-4 w-4" />,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  payment_failed_1: {
    label: "Pago fallido — 1er intento",
    description: "El cobro automático falló por primera vez.",
    icon: <CreditCard className="h-4 w-4" />,
    color: "text-orange-600 bg-orange-50 border-orange-200",
    dot: "bg-orange-400",
  },
  payment_failed_2: {
    label: "Pago fallido — 2do intento",
    description: "Segundo intento de cobro fallido.",
    icon: <CreditCard className="h-4 w-4" />,
    color: "text-orange-600 bg-orange-50 border-orange-200",
    dot: "bg-orange-400",
  },
  payment_failed_3: {
    label: "Pago fallido — 3er intento",
    description: "Tercer fallo. Se suspende el acceso.",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-600 bg-red-50 border-red-200",
    dot: "bg-red-500",
  },
  admission_approved: {
    label: "Admisión aprobada",
    description: "Aprobaste manualmente a un postulante.",
    icon: <UserCheck className="h-4 w-4" />,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
  },
  admission_rejected: {
    label: "Postulación rechazada",
    description: "Rechazaste manualmente a un postulante.",
    icon: <UserX className="h-4 w-4" />,
    color: "text-zinc-600 bg-zinc-100 border-zinc-200",
    dot: "bg-zinc-400",
  },
  follow_up_1: {
    label: "Follow-up admisión 1",
    description: "Recordatorio para postulantes que no respondieron.",
    icon: <Bell className="h-4 w-4" />,
    color: "text-violet-600 bg-violet-50 border-violet-200",
    dot: "bg-violet-500",
  },
  follow_up_2: {
    label: "Follow-up admisión 2",
    description: "Segundo recordatorio sin respuesta.",
    icon: <Bell className="h-4 w-4" />,
    color: "text-violet-600 bg-violet-50 border-violet-200",
    dot: "bg-violet-500",
  },
  subscription_cancelled: {
    label: "Suscripción cancelada",
    description: "El alumno canceló desde el portal.",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-600 bg-red-50 border-red-200",
    dot: "bg-red-500",
  },
  portal_deactivated: {
    label: "Acceso suspendido",
    description: "El portal fue desactivado por falta de pago.",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-600 bg-red-50 border-red-200",
    dot: "bg-red-500",
  },
  application_received: {
    label: "Postulación recibida",
    description: "Alguien completó el formulario de postulación.",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
  },
  onboarding: {
    label: "Bienvenida al portal",
    description: "El alumno activó su cuenta y entró al portal.",
    icon: <LogIn className="h-4 w-4" />,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

const TRIGGER_GROUPS: { label: string; triggers: TriggerEvent[] }[] = [
  {
    label: "Pagos",
    triggers: [
      "checkout_completed",
      "invoice_paid_cuota2",
      "invoice_paid_cuota3",
    ],
  },
  {
    label: "Cobros fallidos",
    triggers: ["payment_failed_1", "payment_failed_2", "payment_failed_3"],
  },
  {
    label: "Admisiones",
    triggers: [
      "application_received",
      "admission_approved",
      "admission_rejected",
      "follow_up_1",
      "follow_up_2",
    ],
  },
  {
    label: "Portal",
    triggers: ["onboarding", "subscription_cancelled", "portal_deactivated"],
  },
];

const ALL_TRIGGERS = Object.keys(TRIGGER_META) as TriggerEvent[];

const TEMPLATE_VARS: { key: string; label: string }[] = [
  { key: "{{nombre}}", label: "Nombre" },
  { key: "{{startup}}", label: "Startup" },
  { key: "{{email}}", label: "Email" },
  { key: "{{checkout_url}}", label: "Link de pago" },
  { key: "{{portal_url}}", label: "Link al portal" },
  { key: "{{cuota_num}}", label: "Nro. de cuota" },
];

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://modofundraising.vercel.app";

function wrapForPreview(content: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center"><table width="100%" style="max-width:520px;">
<tr><td style="padding-bottom:20px;" align="center">
<img src="${APP_URL}/logo-mf-azul.png" alt="Modo Fundraising" width="140" style="display:block;"/>
</td></tr>
<tr><td style="background:#fff;border-radius:16px;padding:36px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
${content}
</td></tr>
<tr><td style="padding:20px 0;text-align:center;">
<p style="margin:0;font-size:11px;color:#a1a1aa;">Modo Fundraising 2026 · Impacta VC<br/>amdin@impacta.vc</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

interface Props {
  initialTemplates: EmailTemplate[];
  initialRules: AutomationRule[];
}

export function ComunicacionesManager({
  initialTemplates,
  initialRules,
}: Props) {
  const [tab, setTab] = useState<"templates" | "reglas">("reglas");
  const [templates, setTemplates] = useState(initialTemplates);
  const [rules, setRules] = useState(initialRules);

  return (
    <div>
      <div className="flex gap-1 border-b border-zinc-200 mb-6">
        {(["reglas", "templates"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t === "reglas" ? (
              <Zap className="h-4 w-4" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {t === "reglas" ? "Automatizaciones" : "Correos"}
          </button>
        ))}
      </div>

      {tab === "reglas" && (
        <WorkflowTab rules={rules} setRules={setRules} templates={templates} />
      )}
      {tab === "templates" && (
        <TemplatesTab templates={templates} setTemplates={setTemplates} />
      )}
    </div>
  );
}

// ─── Workflow Tab (Automatizaciones) ─────────────────────────────────────────

function WorkflowTab({
  rules,
  setRules,
  templates,
}: {
  rules: AutomationRule[];
  setRules: (r: AutomationRule[]) => void;
  templates: EmailTemplate[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] =
    useState<TriggerEvent>("checkout_completed");
  const [newTemplate, setNewTemplate] = useState("");
  const [newDelay, setNewDelay] = useState(0);
  const [creating, setCreating] = useState(false);

  async function toggleRule(rule: AutomationRule) {
    setSaving(rule.id!);
    try {
      await fetch("/api/admin/comunicaciones/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, active: !rule.active }),
      });
      setRules(
        rules.map((r) => (r.id === rule.id ? { ...r, active: !r.active } : r)),
      );
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setSaving(null);
    }
  }

  async function deleteRule(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/comunicaciones/rules?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setRules(rules.filter((r) => r.id !== id));
      toast.success("Automatización eliminada");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newTemplate) {
      toast.error("Seleccioná un correo");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/comunicaciones/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          trigger_event: newTrigger,
          template_id: [newTemplate],
          delay_hours: newDelay,
          channel: "email",
          active: true,
          order: 99,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Automatización creada");
      setShowForm(false);
      setNewName("");
      setNewDelay(0);
      setNewTemplate("");
      const fresh = await fetch("/api/admin/comunicaciones/rules").then((r) =>
        r.json(),
      );
      setRules(fresh);
    } catch {
      toast.error("Error al crear");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* New rule form */}
      {showForm ? (
        <form
          onSubmit={createRule}
          className="border border-blue-200 bg-blue-50 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-900">
              Nueva automatización
            </p>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-zinc-400 hover:text-zinc-600 text-xs"
            >
              ✕ Cancelar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">
                Nombre
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="ej: Bienvenida tras pago"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">
                ¿Cuándo se activa?
              </label>
              <select
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value as TriggerEvent)}
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TRIGGER_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.triggers.map((t) => (
                      <option key={t} value={t}>
                        {TRIGGER_META[t].label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-zinc-400 mt-1">
                {TRIGGER_META[newTrigger].description}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">
                ¿Qué correo se envía?
              </label>
              <select
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Elegir correo...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Esperar antes de enviar
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={newDelay}
                  onChange={(e) => setNewDelay(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-zinc-500">
                  horas (0 = inmediato)
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={creating}
              className="gap-1.5"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Crear automatización
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Nueva automatización
          </Button>
        </div>
      )}

      {/* Groups */}
      {TRIGGER_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 px-1">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.triggers.map((trigger) => {
              const meta = TRIGGER_META[trigger];
              const triggerRules = rules.filter(
                (r) => r.trigger_event === trigger,
              );
              return (
                <WorkflowRow
                  key={trigger}
                  trigger={trigger}
                  meta={meta}
                  rules={triggerRules}
                  saving={saving}
                  confirmDelete={confirmDelete}
                  deleting={deleting}
                  onToggle={toggleRule}
                  onDelete={deleteRule}
                  onConfirmDelete={setConfirmDelete}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Workflow Row ─────────────────────────────────────────────────────────────

function WorkflowRow({
  trigger,
  meta,
  rules,
  saving,
  confirmDelete,
  deleting,
  onToggle,
  onDelete,
  onConfirmDelete,
}: {
  trigger: TriggerEvent;
  meta: (typeof TRIGGER_META)[TriggerEvent];
  rules: AutomationRule[];
  saving: string | null;
  confirmDelete: string | null;
  deleting: string | null;
  onToggle: (r: AutomationRule) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string | null) => void;
}) {
  const hasRules = rules.length > 0;

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${hasRules ? "border-zinc-200 bg-white" : "border-dashed border-zinc-200 bg-zinc-50/50"}`}
    >
      {/* Trigger row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Event pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium shrink-0 ${meta.color}`}
        >
          {meta.icon}
          {meta.label}
        </div>

        {hasRules ? (
          <>
            {/* Arrow */}
            <ArrowRight className="h-4 w-4 text-zinc-300 shrink-0" />

            {/* Rules */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {rules.map((rule) => (
                <div key={rule.id}>
                  {confirmDelete === rule.id ? (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      <p className="text-xs text-red-700 flex-1">
                        ¿Eliminar <strong>{rule.name}</strong>?
                      </p>
                      <button
                        onClick={() => onConfirmDelete(null)}
                        className="text-xs text-zinc-500 hover:text-zinc-700 px-2 py-1"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => onDelete(rule.id!)}
                        disabled={deleting === rule.id}
                        className="flex items-center gap-1 text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting === rule.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-colors ${rule.active ? "bg-white border-zinc-200" : "bg-zinc-50 border-zinc-200 opacity-60"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${rule.active ? meta.dot : "bg-zinc-300"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-zinc-800">
                          {rule.name}
                        </span>
                        <span className="text-xs text-zinc-400 ml-2">
                          {rule.template?.label}
                        </span>
                        {rule.delay_hours > 0 && (
                          <span className="inline-flex items-center gap-1 ml-2 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            <Clock className="h-2.5 w-2.5" />
                            {rule.delay_hours}h
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => onToggle(rule)}
                        disabled={saving === rule.id}
                        className="text-zinc-300 hover:text-zinc-600 disabled:opacity-50 shrink-0"
                        title={rule.active ? "Desactivar" : "Activar"}
                      >
                        {saving === rule.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : rule.active ? (
                          <ToggleRight className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => onConfirmDelete(rule.id!)}
                        className="text-zinc-200 hover:text-red-400 shrink-0 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-zinc-400 ml-1">Sin correo configurado</p>
        )}
      </div>
    </div>
  );
}

// ─── Templates Tab (Correos) ──────────────────────────────────────────────────

function TemplatesTab({
  templates,
  setTemplates,
}: {
  templates: EmailTemplate[];
  setTemplates: (t: EmailTemplate[]) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, EmailTemplate>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function startEdit(t: EmailTemplate) {
    setEditing((prev) => ({ ...prev, [t.id!]: { ...t } }));
    setExpandedId(t.id!);
    setPreview(null);
  }

  function updateField(
    id: string,
    field: keyof EmailTemplate,
    value: string | boolean,
  ) {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function saveTemplate(id: string) {
    setSaving(id);
    try {
      const data = editing[id];
      const res = await fetch("/api/admin/comunicaciones/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      });
      if (!res.ok) throw new Error();
      setTemplates(templates.map((t) => (t.id === id ? { ...t, ...data } : t)));
      toast.success("Correo guardado");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-2">
      {templates.map((t) => {
        const ed = editing[t.id!] ?? t;
        const isOpen = expandedId === t.id;
        const isPreviewing = preview === t.id;

        return (
          <div
            key={t.id}
            className={`bg-white border rounded-2xl overflow-hidden transition-shadow ${isOpen ? "border-blue-300 shadow-sm" : "border-zinc-200"}`}
          >
            <div
              className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-50 transition-colors"
              onClick={() => (isOpen ? setExpandedId(null) : startEdit(t))}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${t.active ? "bg-emerald-500" : "bg-zinc-300"}`}
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900">{t.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-sm">
                    {t.subject}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}
                >
                  {t.active ? "Activo" : "Inactivo"}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                )}
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-zinc-100 p-5 space-y-5">
                {/* Toggle */}
                <div className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">
                      Correo activo
                    </p>
                    <p className="text-xs text-zinc-400">
                      Si está inactivo, no se enviará aunque se dispare el
                      evento.
                    </p>
                  </div>
                  <button
                    onClick={() => updateField(t.id!, "active", !ed.active)}
                  >
                    {ed.active ? (
                      <ToggleRight className="h-7 w-7 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-zinc-400" />
                    )}
                  </button>
                </div>

                {/* Asunto */}
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">
                    Asunto
                  </label>
                  <Input
                    value={ed.subject}
                    onChange={(e) =>
                      updateField(t.id!, "subject", e.target.value)
                    }
                    className="text-sm"
                  />
                </div>

                {/* Cuerpo */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Contenido
                    </label>
                    <button
                      onClick={() => setPreview(isPreviewing ? null : t.id!)}
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      {isPreviewing ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {isPreviewing ? "Editar" : "Ver preview"}
                    </button>
                  </div>

                  {isPreviewing ? (
                    <div className="border border-zinc-200 rounded-xl overflow-hidden">
                      <div className="bg-zinc-100 border-b border-zinc-200 px-3 py-1.5 flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                        </div>
                        <p className="text-xs text-zinc-400 mx-auto">
                          Vista previa del correo
                        </p>
                      </div>
                      <iframe
                        srcDoc={wrapForPreview(ed.body_html)}
                        className="w-full"
                        style={{ height: 500, border: "none" }}
                        title="Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  ) : (
                    <RichEditor
                      value={ed.body_html}
                      onChange={(html) => updateField(t.id!, "body_html", html)}
                    />
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => saveTemplate(t.id!)}
                    disabled={saving === t.id}
                    size="sm"
                    className="gap-2"
                  >
                    {saving === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Guardar
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Rich Editor (Tiptap) ─────────────────────────────────────────────────────

function RichEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, TiptapLink.configure({ openOnClick: false })],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const insertVar = useCallback(
    (varKey: string) => {
      editor?.chain().focus().insertContent(varKey).run();
    },
    [editor],
  );

  const setLink = useCallback(() => {
    const url = window.prompt("URL del link:");
    if (!url) return;
    editor?.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-50 border-b border-zinc-200 flex-wrap">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Negrita"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Cursiva"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={setLink}
          active={editor.isActive("link")}
          title="Insertar link"
        >
          <Link className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Lista"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-zinc-300 mx-1" />

        {/* Variables */}
        {TEMPLATE_VARS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVar(v.key)}
            className="text-[11px] bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full hover:bg-violet-100 transition-colors"
          >
            + {v.label}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-4 py-3 min-h-[220px] focus-within:outline-none text-sm text-zinc-800"
      />
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${active ? "bg-zinc-200 text-zinc-900" : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"}`}
    >
      {children}
    </button>
  );
}

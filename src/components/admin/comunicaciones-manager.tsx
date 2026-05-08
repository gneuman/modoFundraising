"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Mail, Zap, ChevronDown, ChevronUp, Save, Plus, Trash2,
  Eye, EyeOff, Loader2, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EmailTemplate, AutomationRule, TriggerEvent } from "@/lib/airtable";

const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  checkout_completed:    "Pago inicial recibido (Cuota 1)",
  invoice_paid_cuota2:   "Cuota 2 pagada",
  invoice_paid_cuota3:   "Cuota 3 pagada",
  payment_failed_1:      "Pago fallido — intento 1",
  payment_failed_2:      "Pago fallido — intento 2",
  payment_failed_3:      "Pago fallido — intento 3",
  admission_approved:    "Admisión aprobada",
  admission_rejected:    "Postulación rechazada",
  follow_up_1:           "Follow-up admisión 1",
  follow_up_2:           "Follow-up admisión 2",
  subscription_cancelled:"Suscripción cancelada",
  portal_deactivated:    "Portal desactivado por no pago",
  application_received:  "Postulación recibida",
  onboarding:            "Onboarding / acceso al portal",
};

const ALL_TRIGGERS = Object.keys(TRIGGER_LABELS) as TriggerEvent[];

const TEMPLATE_VARS = ["{{nombre}}", "{{email}}", "{{startup}}", "{{checkout_url}}", "{{portal_url}}", "{{cuota_num}}", "{{id}}"];

interface Props {
  initialTemplates: EmailTemplate[];
  initialRules: AutomationRule[];
}

export function ComunicacionesManager({ initialTemplates, initialRules }: Props) {
  const [tab, setTab] = useState<"templates" | "reglas">("templates");
  const [templates, setTemplates] = useState(initialTemplates);
  const [rules, setRules] = useState(initialRules);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-zinc-200 mb-6">
        <button
          onClick={() => setTab("templates")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "templates"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <Mail className="h-4 w-4" />
          Templates
        </button>
        <button
          onClick={() => setTab("reglas")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "reglas"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <Zap className="h-4 w-4" />
          Automatizaciones
        </button>
      </div>

      {tab === "templates" && (
        <TemplatesTab templates={templates} setTemplates={setTemplates} />
      )}
      {tab === "reglas" && (
        <ReglasTabs rules={rules} setRules={setRules} templates={templates} />
      )}
    </div>
  );
}

// ─── Templates Tab ────────────────────────────────────────────────────────────

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
  }

  function updateField(id: string, field: keyof EmailTemplate, value: string | boolean) {
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
      toast.success("Template guardado");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400 mb-4">
        Variables disponibles:{" "}
        {TEMPLATE_VARS.map((v) => (
          <code key={v} className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-xs mr-1">{v}</code>
        ))}
      </p>

      {templates.map((t) => {
        const ed = editing[t.id!] ?? t;
        const isOpen = expandedId === t.id;
        return (
          <div key={t.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            {/* Header row */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-50"
              onClick={() => isOpen ? setExpandedId(null) : startEdit(t)}
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${t.active ? "bg-green-500" : "bg-zinc-300"}`} />
                <span className="font-medium text-sm text-zinc-800">{t.label}</span>
                <code className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">{t.name}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 max-w-[240px] truncate hidden sm:block">{t.subject}</span>
                {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
              </div>
            </div>

            {/* Editor */}
            {isOpen && (
              <div className="border-t border-zinc-100 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-zinc-600 w-16">Activo</label>
                  <button
                    onClick={() => updateField(t.id!, "active", !ed.active)}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    {ed.active
                      ? <ToggleRight className="h-6 w-6 text-green-500" />
                      : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">Asunto</label>
                  <Input
                    value={ed.subject}
                    onChange={(e) => updateField(t.id!, "subject", e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-zinc-600">Cuerpo HTML</label>
                    <button
                      onClick={() => setPreview(preview === t.id ? null : t.id!)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      {preview === t.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {preview === t.id ? "Ocultar preview" : "Preview"}
                    </button>
                  </div>
                  <textarea
                    value={ed.body_html}
                    onChange={(e) => updateField(t.id!, "body_html", e.target.value)}
                    rows={12}
                    className="w-full text-xs font-mono border border-zinc-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                  {preview === t.id && (
                    <div
                      className="mt-3 border border-zinc-200 rounded-lg p-4 bg-zinc-50 text-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: ed.body_html }}
                    />
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => saveTemplate(t.id!)}
                    disabled={saving === t.id}
                    size="sm"
                  >
                    {saving === t.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
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

// ─── Reglas Tab ───────────────────────────────────────────────────────────────

function ReglasTabs({
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
  const [deleting, setDeleting] = useState<string | null>(null);

  // New rule form state
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState<TriggerEvent>("checkout_completed");
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
      setRules(rules.map((r) => (r.id === rule.id ? { ...r, active: !r.active } : r)));
    } catch {
      toast.error("Error al actualizar regla");
    } finally {
      setSaving(null);
    }
  }

  async function deleteRule(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/comunicaciones/rules?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRules(rules.filter((r) => r.id !== id));
      toast.success("Regla eliminada");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(null);
    }
  }

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newTemplate) { toast.error("Selecciona un template"); return; }
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
      toast.success("Regla creada");
      setShowForm(false);
      setNewName(""); setNewDelay(0);
      // Refresh
      const fresh = await fetch("/api/admin/comunicaciones/rules").then((r) => r.json());
      setRules(fresh);
    } catch {
      toast.error("Error al crear regla");
    } finally {
      setCreating(false);
    }
  }

  const grouped = ALL_TRIGGERS.reduce<Record<TriggerEvent, AutomationRule[]>>(
    (acc, t) => ({ ...acc, [t]: rules.filter((r) => r.trigger_event === t) }),
    {} as Record<TriggerEvent, AutomationRule[]>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-zinc-400">
          Cada evento puede tener múltiples reglas. Se ejecutan en orden.
        </p>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva regla
        </Button>
      </div>

      {/* New rule form */}
      {showForm && (
        <form onSubmit={createRule} className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-blue-800">Nueva automatización</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Nombre de la regla</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="ej: Pago cuota 1 → Agradecimiento" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Trigger (evento)</label>
              <select
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value as TriggerEvent)}
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ALL_TRIGGERS.map((t) => (
                  <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Template</label>
              <select
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Delay (horas, 0 = inmediato)</label>
              <Input
                type="number"
                min={0}
                value={newDelay}
                onChange={(e) => setNewDelay(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear regla
            </Button>
          </div>
        </form>
      )}

      {/* Rules grouped by trigger */}
      <div className="space-y-3">
        {ALL_TRIGGERS.map((trigger) => {
          const triggerRules = grouped[trigger];
          return (
            <div key={trigger} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-sm font-medium text-zinc-700">{TRIGGER_LABELS[trigger]}</span>
                </div>
                <span className="text-xs text-zinc-400">{triggerRules.length} {triggerRules.length === 1 ? "regla" : "reglas"}</span>
              </div>

              {triggerRules.length === 0 ? (
                <div className="px-4 py-3 text-xs text-zinc-400 italic">Sin reglas — este evento no enviará ningún email</div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {triggerRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${rule.active ? "bg-green-500" : "bg-zinc-300"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-800 truncate">{rule.name}</p>
                          <p className="text-xs text-zinc-400">
                            {rule.template?.label ?? "Template no encontrado"}
                            {rule.delay_hours > 0 && ` · ${rule.delay_hours}h de delay`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleRule(rule)}
                          disabled={saving === rule.id}
                          className="text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
                          title={rule.active ? "Desactivar" : "Activar"}
                        >
                          {saving === rule.id
                            ? <Loader2 className="h-5 w-5 animate-spin" />
                            : rule.active
                              ? <ToggleRight className="h-5 w-5 text-green-500" />
                              : <ToggleLeft className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id!)}
                          disabled={deleting === rule.id}
                          className="text-zinc-300 hover:text-red-500 disabled:opacity-50"
                          title="Eliminar regla"
                        >
                          {deleting === rule.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

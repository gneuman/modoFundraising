"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Mail, Zap, ChevronDown, ChevronUp, Save, Plus, Trash2,
  Loader2, ToggleLeft, ToggleRight, Eye, EyeOff, AlertTriangle,
  CreditCard, UserCheck, UserX, Bell, XCircle, LogIn, MessageSquare,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EmailTemplate, AutomationRule, TriggerEvent } from "@/lib/airtable";

// ─── Metadata por trigger ─────────────────────────────────────────────────────

const TRIGGER_META: Record<TriggerEvent, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  checkout_completed:    { label: "Pago inicial recibido",      description: "Se envía cuando alguien paga la primera cuota y se une al programa.", icon: <CreditCard className="h-4 w-4" />, color: "text-green-600 bg-green-50 border-green-200" },
  invoice_paid_cuota2:   { label: "Cuota 2 pagada",             description: "Confirmación de que el segundo pago fue procesado correctamente.",    icon: <CreditCard className="h-4 w-4" />, color: "text-green-600 bg-green-50 border-green-200" },
  invoice_paid_cuota3:   { label: "Cuota 3 pagada",             description: "Confirmación del tercer y último pago del programa.",                 icon: <CreditCard className="h-4 w-4" />, color: "text-green-600 bg-green-50 border-green-200" },
  payment_failed_1:      { label: "Pago fallido — 1er intento", description: "El cobro automático falló por primera vez. Se avisa al alumno.",     icon: <AlertTriangle className="h-4 w-4" />, color: "text-orange-600 bg-orange-50 border-orange-200" },
  payment_failed_2:      { label: "Pago fallido — 2do intento", description: "Segundo intento fallido. Oportunidad de recordar antes de suspender.", icon: <AlertTriangle className="h-4 w-4" />, color: "text-orange-600 bg-orange-50 border-orange-200" },
  payment_failed_3:      { label: "Pago fallido — 3er intento", description: "Tercer fallo. Generalmente se suspende el acceso luego de esto.",    icon: <XCircle className="h-4 w-4" />, color: "text-red-600 bg-red-50 border-red-200" },
  admission_approved:    { label: "Admisión aprobada",          description: "Se envía cuando aprobás manualmente a un postulante.",               icon: <UserCheck className="h-4 w-4" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
  admission_rejected:    { label: "Postulación rechazada",      description: "Se envía cuando rechazás manualmente a un postulante.",              icon: <UserX className="h-4 w-4" />, color: "text-zinc-600 bg-zinc-50 border-zinc-200" },
  follow_up_1:           { label: "Follow-up de admisión 1",    description: "Recordatorio automático para postulantes que no respondieron.",      icon: <Bell className="h-4 w-4" />, color: "text-purple-600 bg-purple-50 border-purple-200" },
  follow_up_2:           { label: "Follow-up de admisión 2",    description: "Segundo recordatorio si el primero no tuvo respuesta.",              icon: <Bell className="h-4 w-4" />, color: "text-purple-600 bg-purple-50 border-purple-200" },
  subscription_cancelled:{ label: "Suscripción cancelada",      description: "El alumno canceló su suscripción desde el portal.",                 icon: <XCircle className="h-4 w-4" />, color: "text-red-600 bg-red-50 border-red-200" },
  portal_deactivated:    { label: "Acceso suspendido",          description: "El portal fue desactivado por falta de pago.",                      icon: <XCircle className="h-4 w-4" />, color: "text-red-600 bg-red-50 border-red-200" },
  application_received:  { label: "Postulación recibida",       description: "Confirmación automática cuando alguien completa el formulario.",    icon: <MessageSquare className="h-4 w-4" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
  onboarding:            { label: "Bienvenida al portal",       description: "Se envía cuando el alumno activa su cuenta y entra al portal.",      icon: <LogIn className="h-4 w-4" />, color: "text-green-600 bg-green-50 border-green-200" },
};

const ALL_TRIGGERS = Object.keys(TRIGGER_META) as TriggerEvent[];

const TEMPLATE_VARS: { key: string; label: string; example: string }[] = [
  { key: "{{nombre}}",       label: "Nombre",         example: "María García" },
  { key: "{{startup}}",      label: "Startup",        example: "EcoTech" },
  { key: "{{email}}",        label: "Email",          example: "maria@startup.com" },
  { key: "{{checkout_url}}", label: "Link de pago",   example: "https://..." },
  { key: "{{portal_url}}",   label: "Link al portal", example: "https://..." },
  { key: "{{cuota_num}}",    label: "Nro. de cuota",  example: "2" },
  { key: "{{id}}",           label: "ID interno",     example: "rec123abc" },
];

// ─── Layout del email (para preview) ─────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://modofundraising.vercel.app";

function wrapForPreview(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;">
        <tr><td style="padding-bottom:20px;" align="center">
          <img src="${APP_URL}/logo-mf-azul.png" alt="Modo Fundraising" width="140" style="display:block;" />
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;padding:36px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          ${content}
        </td></tr>
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;">Modo Fundraising 2026 · Impacta VC<br/>hello@impacta.vc</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialTemplates: EmailTemplate[];
  initialRules: AutomationRule[];
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function ComunicacionesManager({ initialTemplates, initialRules }: Props) {
  const [tab, setTab] = useState<"templates" | "reglas">("templates");
  const [templates, setTemplates] = useState(initialTemplates);
  const [rules, setRules] = useState(initialRules);

  return (
    <div>
      <div className="flex gap-1 border-b border-zinc-200 mb-6">
        <TabButton active={tab === "templates"} onClick={() => setTab("templates")} icon={<Mail className="h-4 w-4" />} label="Correos" />
        <TabButton active={tab === "reglas"} onClick={() => setTab("reglas")} icon={<Zap className="h-4 w-4" />} label="Automatizaciones" />
      </div>

      {tab === "templates" && <TemplatesTab templates={templates} setTemplates={setTemplates} />}
      {tab === "reglas" && <ReglasTabs rules={rules} setRules={setRules} templates={templates} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-blue-600 text-blue-700" : "border-transparent text-zinc-500 hover:text-zinc-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Templates Tab ────────────────────────────────────────────────────────────

function TemplatesTab({ templates, setTemplates }: { templates: EmailTemplate[]; setTemplates: (t: EmailTemplate[]) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, EmailTemplate>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function startEdit(t: EmailTemplate) {
    setEditing((prev) => ({ ...prev, [t.id!]: { ...t } }));
    setExpandedId(t.id!);
    setPreview(null);
  }

  function updateField(id: string, field: keyof EmailTemplate, value: string | boolean) {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function insertVar(id: string, variable: string) {
    const current = editing[id]?.body_html ?? "";
    updateField(id, "body_html", current + variable);
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
      toast.success("Correo guardado correctamente");
    } catch {
      toast.error("Error al guardar el correo");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Intro */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
        <p className="text-sm text-blue-800 font-medium mb-1">¿Qué son los correos?</p>
        <p className="text-sm text-blue-700">Son los mensajes que se envían automáticamente a los alumnos. Podés editar el asunto y el contenido de cada uno.</p>
      </div>

      {templates.map((t) => {
        const ed = editing[t.id!] ?? t;
        const isOpen = expandedId === t.id;
        const isPreviewing = preview === t.id;

        return (
          <div key={t.id} className={`bg-white border rounded-xl overflow-hidden transition-shadow ${isOpen ? "border-blue-300 shadow-sm" : "border-zinc-200"}`}>
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-zinc-50 transition-colors"
              onClick={() => isOpen ? setExpandedId(null) : startEdit(t)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.active ? "bg-green-500" : "bg-zinc-300"}`} />
                <div>
                  <p className="font-medium text-sm text-zinc-900">{t.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{t.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
                  {t.active ? "Activo" : "Inactivo"}
                </span>
                {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
              </div>
            </div>

            {/* Editor */}
            {isOpen && (
              <div className="border-t border-zinc-100 p-5 space-y-5">

                {/* Toggle activo */}
                <div className="flex items-center justify-between bg-zinc-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Correo activo</p>
                    <p className="text-xs text-zinc-400">Si está inactivo, no se enviará aunque se active el evento.</p>
                  </div>
                  <button onClick={() => updateField(t.id!, "active", !ed.active)}>
                    {ed.active
                      ? <ToggleRight className="h-7 w-7 text-green-500" />
                      : <ToggleLeft className="h-7 w-7 text-zinc-400" />}
                  </button>
                </div>

                {/* Asunto */}
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1.5 uppercase tracking-wide">Asunto del correo</label>
                  <Input
                    value={ed.subject}
                    onChange={(e) => updateField(t.id!, "subject", e.target.value)}
                    className="text-sm"
                    placeholder="ej: ¡Bienvenido/a a Modo Fundraising, {{nombre}}!"
                  />
                  <p className="text-xs text-zinc-400 mt-1">Podés usar variables como <code className="bg-zinc-100 px-1 rounded">{"{{nombre}}"}</code> para personalizar.</p>
                </div>

                {/* Cuerpo */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Contenido del correo</label>
                    <button
                      onClick={() => setPreview(isPreviewing ? null : t.id!)}
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {isPreviewing ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {isPreviewing ? "Editar" : "Ver cómo queda"}
                    </button>
                  </div>

                  {/* Variables */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {TEMPLATE_VARS.map((v) => (
                      <button
                        key={v.key}
                        onClick={() => insertVar(t.id!, v.key)}
                        title={`Ejemplo: ${v.example}`}
                        className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-full hover:bg-purple-100 transition-colors"
                      >
                        + {v.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">Clic en un botón para insertar la variable al final del texto.</p>

                  {isPreviewing ? (
                    <div className="border border-zinc-200 rounded-xl overflow-hidden bg-[#f4f4f5]">
                      <div className="bg-zinc-100 border-b border-zinc-200 px-3 py-2 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                        <p className="text-xs text-zinc-500 font-medium">Vista previa del correo</p>
                      </div>
                      <iframe
                        srcDoc={wrapForPreview(ed.body_html)}
                        className="w-full"
                        style={{ height: 480, border: "none" }}
                        title="Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  ) : (
                    <textarea
                      value={ed.body_html}
                      onChange={(e) => updateField(t.id!, "body_html", e.target.value)}
                      rows={14}
                      className="w-full text-xs font-mono border border-zinc-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-zinc-50"
                      placeholder="Escribí el contenido HTML del correo aquí..."
                    />
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <Button onClick={() => saveTemplate(t.id!)} disabled={saving === t.id} size="sm" className="gap-2">
                    {saving === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar cambios
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

// Categorías para agrupar triggers
const TRIGGER_GROUPS: { label: string; triggers: TriggerEvent[] }[] = [
  { label: "Pagos",         triggers: ["checkout_completed", "invoice_paid_cuota2", "invoice_paid_cuota3"] },
  { label: "Cobros fallidos", triggers: ["payment_failed_1", "payment_failed_2", "payment_failed_3"] },
  { label: "Admisiones",    triggers: ["application_received", "admission_approved", "admission_rejected", "follow_up_1", "follow_up_2"] },
  { label: "Portal",        triggers: ["onboarding", "subscription_cancelled", "portal_deactivated"] },
];

function ReglasTabs({ rules, setRules, templates }: { rules: AutomationRule[]; setRules: (r: AutomationRule[]) => void; templates: EmailTemplate[] }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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
      toast.error("Error al actualizar");
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
      setConfirmDelete(null);
    }
  }

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newTemplate) { toast.error("Seleccioná un correo"); return; }
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
      setNewName(""); setNewDelay(0); setNewTemplate("");
      const fresh = await fetch("/api/admin/comunicaciones/rules").then((r) => r.json());
      setRules(fresh);
    } catch {
      toast.error("Error al crear la automatización");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800 font-medium mb-1">¿Qué son las automatizaciones?</p>
        <p className="text-sm text-amber-700">Cada automatización conecta un <strong>evento</strong> (algo que pasó) con un <strong>correo</strong> (lo que se envía). Podés activar o desactivar cada una sin borrarla.</p>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nueva automatización
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={createRule} className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-blue-800">Nueva automatización</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">Nombre (para identificarla)</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="ej: Confirmación de pago cuota 1" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">¿Cuándo se dispara?</label>
              <select
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value as TriggerEvent)}
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TRIGGER_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.triggers.map((t) => (
                      <option key={t} value={t}>{TRIGGER_META[t].label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-zinc-400 mt-1">{TRIGGER_META[newTrigger].description}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 block mb-1">¿Qué correo se envía?</label>
              <select
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar correo...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
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
                  className="w-24"
                />
                <span className="text-sm text-zinc-500">horas (0 = inmediato)</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={creating} className="gap-1.5">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear automatización
            </Button>
          </div>
        </form>
      )}

      {/* Grouped rules */}
      <div className="space-y-6">
        {TRIGGER_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">{group.label}</p>
            <div className="space-y-2">
              {group.triggers.map((trigger) => {
                const meta = TRIGGER_META[trigger];
                const triggerRules = rules.filter((r) => r.trigger_event === trigger);
                return (
                  <div key={trigger} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                    {/* Trigger header */}
                    <div className={`flex items-start gap-3 px-4 py-3 border-b border-zinc-100`}>
                      <div className={`mt-0.5 p-1.5 rounded-lg border ${meta.color}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-800">{meta.label}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{meta.description}</p>
                      </div>
                      <span className="text-xs text-zinc-400 shrink-0 mt-1">
                        {triggerRules.length === 0 ? "Sin correo" : `${triggerRules.length} ${triggerRules.length === 1 ? "correo" : "correos"}`}
                      </span>
                    </div>

                    {/* Rules */}
                    {triggerRules.length === 0 ? (
                      <div className="px-4 py-3 flex items-center gap-2 text-xs text-zinc-400">
                        <Mail className="h-3.5 w-3.5" />
                        No hay correo configurado para este evento.
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {triggerRules.map((rule) => (
                          <div key={rule.id}>
                            {/* Confirm delete */}
                            {confirmDelete === rule.id ? (
                              <div className="flex items-center justify-between px-4 py-3 bg-red-50">
                                <p className="text-sm text-red-700">¿Eliminar <strong>{rule.name}</strong>?</p>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                                  <Button
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                                    onClick={() => deleteRule(rule.id!)}
                                    disabled={deleting === rule.id}
                                  >
                                    {deleting === rule.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    Eliminar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${rule.active ? "bg-green-500" : "bg-zinc-300"}`} />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-zinc-800 truncate">{rule.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs text-zinc-400">
                                        {rule.template?.label ?? "Correo no encontrado"}
                                      </span>
                                      {rule.delay_hours > 0 && (
                                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                          <Clock className="h-3 w-3" />
                                          {rule.delay_hours}h después
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 ml-4">
                                  <button
                                    onClick={() => toggleRule(rule)}
                                    disabled={saving === rule.id}
                                    className="text-zinc-400 hover:text-zinc-600 disabled:opacity-50 p-1"
                                    title={rule.active ? "Desactivar" : "Activar"}
                                  >
                                    {saving === rule.id
                                      ? <Loader2 className="h-5 w-5 animate-spin" />
                                      : rule.active
                                        ? <ToggleRight className="h-5 w-5 text-green-500" />
                                        : <ToggleLeft className="h-5 w-5" />}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDelete(rule.id!)}
                                    className="text-zinc-300 hover:text-red-500 p-1 transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Users, Loader2, UserCheck, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALL_COUNTRIES } from "@/lib/countries";

interface TeamMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  founder_role?: string;
  portal_access: boolean;
}

interface Props {
  founderEmail: string;
  founderName: string;
  startupName: string;
  team: TeamMember[];
}

export function EquipoClient({ founderEmail, founderName, startupName, team }: Props) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [newMembers, setNewMembers] = useState<TeamMember[]>([]);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    whatsapp: "",
    linkedin: "",
    rol: "",
    pais: "",
    es_mujer: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const formValido = form.nombre && form.apellido && form.email && form.rol;

  async function handleInvitar(e: React.FormEvent) {
    e.preventDefault();
    if (!formValido) return;

    setSending(true);
    try {
      const res = await fetch("/api/equipo/invitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, startupName, founderName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al agregar miembro");

      setNewMembers((prev) => [...prev, {
        id: Date.now().toString(),
        email: form.email,
        first_name: form.nombre,
        last_name: form.apellido,
        founder_role: form.rol,
        portal_access: false,
      }]);
      toast.success(`${form.nombre} fue agregado al equipo`);
      setForm({ nombre: "", apellido: "", email: "", whatsapp: "", linkedin: "", rol: "", pais: "", es_mujer: "" });
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al agregar miembro");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Equipo</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestiona los miembros de {startupName}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">Miembros en el equipo</p>
          <p className="text-2xl font-bold text-zinc-800 mt-1">{team.length + newMembers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">Con acceso al portal</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{[...team, ...newMembers].filter((m) => m.portal_access).length}</p>
        </div>
      </div>

      {/* Miembros */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200">
          <h3 className="text-sm font-semibold text-zinc-700">Miembros ({team.length + newMembers.length})</h3>
        </div>
        <div className="divide-y divide-zinc-100">
          {team.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-4">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${m.email === founderEmail ? "bg-blue-100" : "bg-zinc-100"}`}>
                {m.email === founderEmail
                  ? <UserCheck className="h-4 w-4 text-blue-600" />
                  : <Users className="h-4 w-4 text-zinc-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-800">{m.first_name} {m.last_name}</p>
                <p className="text-sm text-zinc-500 truncate">{m.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.founder_role && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                    {m.founder_role}
                  </span>
                )}
                <span className={`w-2 h-2 rounded-full ${m.portal_access ? "bg-green-500" : "bg-zinc-300"}`} title={m.portal_access ? "Con acceso al portal" : "Sin acceso aún"} />
              </div>
            </div>
          ))}

          {newMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-4 bg-green-50/40">
              <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-800">{m.first_name} {m.last_name}</p>
                <p className="text-sm text-zinc-500 truncate">{m.email}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                {m.founder_role} · Recién agregado
              </span>
            </div>
          ))}

          {team.length === 0 && newMembers.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-zinc-400">
              No hay miembros registrados aún.
            </div>
          )}
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-800 mb-5">Agregar miembro al equipo</h3>
        <form onSubmit={handleInvitar} className="space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">Nombre *</label>
              <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ana" required disabled={sending} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">Apellido *</label>
              <Input value={form.apellido} onChange={(e) => set("apellido", e.target.value)} placeholder="García" required disabled={sending} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">Email *</label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ana@startup.com" required disabled={sending} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">WhatsApp</label>
              <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+521234567890" disabled={sending} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">LinkedIn</label>
            <Input value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/in/anagarcia" disabled={sending} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">Rol en la startup *</label>
              <Input value={form.rol} onChange={(e) => set("rol", e.target.value)} placeholder="CTO, COO, Cofundador/a..." required disabled={sending} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">País de residencia</label>
              <select
                value={form.pais}
                onChange={(e) => set("pais", e.target.value)}
                disabled={sending}
                className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona...</option>
                {ALL_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">¿Es mujer parte del equipo?</label>
            <div className="flex gap-4">
              {["Sí", "No"].map((op) => (
                <label key={op} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="es_mujer"
                    value={op}
                    checked={form.es_mujer === op}
                    onChange={(e) => set("es_mujer", e.target.value)}
                    disabled={sending}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-zinc-700">{op}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-1">
            <Button type="submit" disabled={sending || !formValido} className="bg-blue-600 hover:bg-blue-700 text-white">
              {done ? (
                <><CheckCircle2 className="h-4 w-4 mr-2" />Agregado</>
              ) : sending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />Agregar al equipo</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

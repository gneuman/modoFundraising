"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, ExternalLink, CheckCircle, XCircle, X, Loader2, BellOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/airtable";

const STATUS_TABS: { label: string; value: ApplicationStatus | "all" }[] = [
  { label: "Todas", value: "all" },
  { label: "Nuevas", value: "Nueva postulación" },
  { label: "Admitidas", value: "Admitida" },
  { label: "Sin respuesta", value: "Sin Respuesta" },
  { label: "Rechazadas", value: "Rechazada" },
  { label: "Inscritas", value: "Inscrita" },
  { label: "Churn", value: "Churn" },
];

const STATUS_COLORS: Record<string, string> = {
  "Nueva postulación": "bg-zinc-100 text-zinc-600",
  "En revisión": "bg-amber-100 text-amber-700",
  "Admitida": "bg-blue-100 text-blue-700",
  "Rechazada": "bg-red-100 text-red-700",
  "Sin Respuesta": "bg-zinc-100 text-zinc-500",
  "Rechazada por founder": "bg-orange-100 text-orange-700",
  "Inscrita": "bg-green-100 text-green-700",
  "Invitada institucional": "bg-purple-100 text-purple-700",
  "Churn": "bg-red-100 text-red-600",
};

type ModalType = "Admitida" | "Rechazada" | null;

interface ModalState {
  type: ModalType;
  recordId: string;
  startupName: string;
  founderName: string;
  reason: string;
}

export function PostulacionesTable({ initialData }: { initialData: ApplicationRecord[] }) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<ApplicationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  // Hide rejected from "all" and "En revisión" tabs — show only when filter is active
  const filtered = useMemo(() => {
    return data.filter((a) => {
      if (activeTab === "all" && a.status === "Rechazada") return false;
      const matchesTab = activeTab === "all" || a.status === activeTab;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        a.startup_name?.toLowerCase().includes(q) ||
        a.first_name?.toLowerCase().includes(q) ||
        a.last_name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.startup_country_ops?.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [data, activeTab, search]);

  function openModal(type: "Admitida" | "Rechazada", a: ApplicationRecord) {
    setModal({
      type,
      recordId: a.id!,
      startupName: a.startup_name ?? "",
      founderName: `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim(),
      reason: "",
    });
  }

  async function marcarSinRespuesta(a: ApplicationRecord) {
    setUpdating(a.id!);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: a.id, status: "Sin Respuesta" }),
      });
      if (!res.ok) throw new Error();
      setData((prev) => prev.map((r) => r.id === a.id ? { ...r, status: "Sin Respuesta" } : r));
      toast.success(`${a.startup_name} marcada como Sin respuesta`);
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setUpdating(null);
    }
  }

  async function confirmAction() {
    if (!modal) return;
    setUpdating(modal.recordId);
    try {
      const body: Record<string, unknown> = {
        recordId: modal.recordId,
        status: modal.type,
      };
      if (modal.reason) body.rejection_reason = modal.reason;

      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();

      setData((prev) =>
        prev.map((a) =>
          a.id === modal.recordId
            ? { ...a, status: modal.type as ApplicationStatus, rejection_reason: modal.reason }
            : a
        )
      );
      toast.success(
        modal.type === "Admitida"
          ? `✅ ${modal.startupName} admitida — se envió email con link de pago`
          : `${modal.startupName} marcada como rechazada`
      );
      setModal(null);
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setUpdating(null);
    }
  }

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: data.filter((a) => a.status !== "Rechazada").length };
    STATUS_TABS.slice(1).forEach(({ value }) => {
      counts[value] = data.filter((a) => a.status === value).length;
    });
    return counts;
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl overflow-x-auto">
        {STATUS_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === value
                ? "bg-white text-zinc-800 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            {label}
            <span className="text-xs opacity-60">({tabCounts[value] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por startup, nombre, email, país..."
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Startup / Founder</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">País</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Etapa</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">MRR</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Deck</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Acciones</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-400">
                    No hay postulaciones que coincidan
                  </td>
                </tr>
              )}
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-800">{a.startup_name}</p>
                    <p className="text-xs text-zinc-400">{a.first_name} {a.last_name} · {a.email}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{a.startup_country_ops}</td>
                  <td className="px-4 py-3 text-zinc-600 text-xs">{a.startup_stage}</td>
                  <td className="px-4 py-3 text-zinc-700 font-mono">
                    {a.startup_mrr ? `$${Number(a.startup_mrr).toLocaleString()}` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {a.deck_url ? (
                      <a href={a.deck_url as string} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs">
                        Ver <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                      STATUS_COLORS[a.status ?? "Nueva postulación"] ?? "bg-zinc-100 text-zinc-600"
                    )}>
                      {a.status ?? "Nueva postulación"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {a.status === "Nueva postulación" && (
                        <>
                          <button
                            onClick={() => openModal("Admitida", a)}
                            disabled={updating === a.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Admitir
                          </button>
                          <button
                            onClick={() => openModal("Rechazada", a)}
                            disabled={updating === a.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Rechazar
                          </button>
                        </>
                      )}
                      {a.status === "Admitida" && (
                        <button
                          onClick={() => marcarSinRespuesta(a)}
                          disabled={updating === a.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 text-xs font-medium transition-colors"
                        >
                          <BellOff className="h-3.5 w-3.5" />
                          Sin respuesta
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {a.created_at ? new Date(a.created_at as string).toLocaleDateString("es") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-800">
                  {modal.type === "Admitida" ? "✅ Admitir postulación" : "Rechazar postulación"}
                </h3>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {modal.startupName} — {modal.founderName}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                {modal.type === "Admitida"
                  ? "Mensaje de admisión (opcional)"
                  : "Razón de rechazo (opcional)"}
              </label>
              <textarea
                value={modal.reason}
                onChange={(e) => setModal((m) => m ? { ...m, reason: e.target.value } : m)}
                placeholder={
                  modal.type === "Admitida"
                    ? "Ej: Excelente tracción, encaja perfecto con el programa..."
                    : "Ej: El MRR no cumple el mínimo requerido para esta cohorte..."
                }
                rows={4}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {modal.type === "Admitida" && (
              <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
                Se enviará automáticamente un email con el link de pago de Stripe.
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                onClick={confirmAction}
                disabled={!!updating}
                className={cn(
                  "flex-1",
                  modal.type === "Admitida"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                )}
              >
                {updating ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Procesando...</>
                ) : modal.type === "Admitida" ? "Confirmar admisión" : "Confirmar rechazo"}
              </Button>
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

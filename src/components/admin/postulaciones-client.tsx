"use client";

import { useState } from "react";
import { LayoutGrid, Table2, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PostulacionesTable } from "@/components/admin/postulaciones-table";
import { KanbanPostulaciones } from "@/components/admin/kanban-postulaciones";
import type { ApplicationRecord, CouponRecord, PagoRecord } from "@/lib/airtable";

interface Props {
  initialData: ApplicationRecord[];
  initialCoupons: CouponRecord[];
  initialPagos: PagoRecord[];
}

export function PostulacionesClient({ initialData, initialCoupons, initialPagos }: Props) {
  const [tab, setTab] = useState<"completas" | "incompletas">("completas");
  const [vista, setVista] = useState<"tabla" | "kanban">("kanban");
  const [enviandoSeguimiento, setEnviandoSeguimiento] = useState(false);
  const [enviandoRecordatorio, setEnviandoRecordatorio] = useState(false);

  // Excluir inscritas e invitadas institucionales — esas viven en Empresas activas
  const HIDDEN_STATUSES = new Set(["Inscrita", "Invitada institucional"]);
  const visibles = initialData.filter((p) => !p.status || !HIDDEN_STATUSES.has(p.status));
  const completas = visibles.filter((p) => p.accept_legal_terms === true);
  const incompletas = visibles.filter((p) => !p.accept_legal_terms);
  const datos = tab === "completas" ? completas : incompletas;

  async function enviarSeguimientos() {
    setEnviandoSeguimiento(true);
    try {
      const res = await fetch("/api/admin/applications/followup", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error");
      if (json.sent === 0) {
        toast.info(json.message ?? "No hay admitidas sin pago pendiente");
      } else {
        toast.success(`Seguimiento enviado a ${json.sent}/${json.total} postulaciones`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar seguimientos");
    } finally {
      setEnviandoSeguimiento(false);
    }
  }

  async function enviarRecordatorios() {
    setEnviandoRecordatorio(true);
    try {
      const res = await fetch("/api/admin/applications/recordatorio-form", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error");
      if (json.sent === 0) {
        toast.info("No hay postulaciones incompletas con email válido");
      } else {
        toast.success(`Recordatorio enviado a ${json.sent} postulaciones incompletas`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar recordatorios");
    } finally {
      setEnviandoRecordatorio(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Postulaciones</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {completas.length} completas · {incompletas.length} incompletas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "completas" ? (
            <button
              onClick={enviarSeguimientos}
              disabled={enviandoSeguimiento}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-medium transition-colors disabled:opacity-50 border border-amber-200"
            >
              {enviandoSeguimiento ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              {enviandoSeguimiento ? "Enviando..." : "Enviar seguimientos"}
            </button>
          ) : (
            <button
              onClick={enviarRecordatorios}
              disabled={enviandoRecordatorio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 text-sm font-medium transition-colors disabled:opacity-50 border border-orange-200"
            >
              {enviandoRecordatorio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              {enviandoRecordatorio ? "Enviando..." : "Recordar completar form"}
            </button>
          )}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg">
            <button
              onClick={() => setVista("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vista === "kanban" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setVista("tabla")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vista === "tabla" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              Tabla
            </button>
          </div>
        </div>
      </div>

      {/* Tabs completas / incompletas */}
      <div className="flex gap-1 border-b border-zinc-200">
        <button
          onClick={() => setTab("completas")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === "completas"
              ? "border-zinc-800 text-zinc-800"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Completas
          <span className="ml-2 text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{completas.length}</span>
        </button>
        <button
          onClick={() => setTab("incompletas")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === "incompletas"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Incompletas
          <span className="ml-2 text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">{incompletas.length}</span>
        </button>
      </div>

      {vista === "kanban" ? (
        <KanbanPostulaciones key={tab} initialData={datos} coupons={initialCoupons} pagos={initialPagos} />
      ) : (
        <PostulacionesTable initialData={datos} />
      )}
    </div>
  );
}

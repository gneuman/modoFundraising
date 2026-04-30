"use client";

import { useState } from "react";
import { LayoutGrid, Table2, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PostulacionesTable } from "@/components/admin/postulaciones-table";
import { KanbanPostulaciones } from "@/components/admin/kanban-postulaciones";
import type { ApplicationRecord, CouponRecord } from "@/lib/airtable";

interface Props {
  initialData: ApplicationRecord[];
  initialCoupons: CouponRecord[];
}

export function PostulacionesClient({ initialData, initialCoupons }: Props) {
  const [vista, setVista] = useState<"tabla" | "kanban">("kanban");
  const [enviandoSeguimiento, setEnviandoSeguimiento] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Postulaciones</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {`${initialData.length} postulaciones recibidas`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={enviarSeguimientos}
            disabled={enviandoSeguimiento}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-medium transition-colors disabled:opacity-50 border border-amber-200"
          >
            {enviandoSeguimiento
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Bell className="h-4 w-4" />
            }
            {enviandoSeguimiento ? "Enviando..." : "Enviar seguimientos"}
          </button>
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

      {vista === "kanban" ? (
        <KanbanPostulaciones initialData={initialData} coupons={initialCoupons} />
      ) : (
        <PostulacionesTable initialData={initialData} />
      )}
    </div>
  );
}

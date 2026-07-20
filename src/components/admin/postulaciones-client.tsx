"use client";

import { useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { PostulacionesTable } from "@/components/admin/postulaciones-table";
import { KanbanPostulaciones } from "@/components/admin/kanban-postulaciones";
import type { ApplicationRecord, CouponRecord, PagoRecord } from "@/lib/airtable";

interface Props {
  initialData: ApplicationRecord[];
  initialCoupons: CouponRecord[];
  initialPagos: PagoRecord[];
}

export function PostulacionesClient({ initialData, initialCoupons, initialPagos }: Props) {
  const [vista, setVista] = useState<"tabla" | "kanban">("kanban");

  // Excluir inscritas e invitadas institucionales — esas viven en Empresas activas
  const HIDDEN_STATUSES = new Set(["Inscrita", "Invitada institucional"]);
  const visibles = initialData.filter((p) => !p.status || !HIDDEN_STATUSES.has(p.status));
  const datos = visibles.filter((p) => p.accept_legal_terms === true);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Postulaciones</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {datos.length} postulaciones
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        <KanbanPostulaciones initialData={datos} coupons={initialCoupons} pagos={initialPagos} />
      ) : (
        <PostulacionesTable initialData={datos} />
      )}
    </div>
  );
}

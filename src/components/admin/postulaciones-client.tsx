"use client";

import { useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { PostulacionesTable } from "@/components/admin/postulaciones-table";
import { KanbanPostulaciones } from "@/components/admin/kanban-postulaciones";
import type { ApplicationRecord, CouponRecord } from "@/lib/airtable";

interface Props {
  initialData: ApplicationRecord[];
  initialCoupons: CouponRecord[];
}

export function PostulacionesClient({ initialData, initialCoupons }: Props) {
  const [vista, setVista] = useState<"tabla" | "kanban">("kanban");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Postulaciones</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {`${initialData.length} postulaciones recibidas`}
          </p>
        </div>
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

      {vista === "kanban" ? (
        <KanbanPostulaciones initialData={initialData} coupons={initialCoupons} />
      ) : (
        <PostulacionesTable initialData={initialData} />
      )}
    </div>
  );
}

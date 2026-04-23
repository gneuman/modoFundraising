"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { PostulacionesTable } from "@/components/admin/postulaciones-table";
import { KanbanPostulaciones } from "@/components/admin/kanban-postulaciones";
import type { ApplicationRecord, CouponRecord } from "@/lib/airtable";

export default function PostulacionesPage() {
  const [vista, setVista] = useState<"tabla" | "kanban">("kanban");
  const [data, setData] = useState<ApplicationRecord[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/applications").then((r) => r.json()),
      fetch("/api/admin/coupons").then((r) => r.json()),
    ]).then(([apps, cups]) => {
      setData(apps);
      setCoupons(cups);
      setCargando(false);
    }).catch(() => setCargando(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Postulaciones</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {cargando ? "Cargando..." : `${data.length} postulaciones recibidas`}
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

      {cargando ? (
        <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
          Cargando postulaciones...
        </div>
      ) : vista === "kanban" ? (
        <KanbanPostulaciones initialData={data} coupons={coupons} />
      ) : (
        <PostulacionesTable initialData={data} />
      )}
    </div>
  );
}

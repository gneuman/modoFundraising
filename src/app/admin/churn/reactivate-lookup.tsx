"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search, RotateCcw } from "lucide-react";

// Reactiva por búsqueda: el admin pega un correo de founder o el nombre de la
// startup y recupera TODOS los accesos, sin necesitar el recordId de la fila.
// Pega al PATCH de applications con action=reactivate_by_lookup. NO toca Stripe
// (mismo criterio que "Reactivar sin cobro"): deja la postulación en "Admitida"
// con portal_access=true y reinvita a S1/S2 en calendar.
export function ReactivateLookup() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  async function doReactivate() {
    const q = query.trim();
    if (!q) {
      toast.error("Escribe un correo de founder o el nombre de la startup.");
      return;
    }
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reactivate_by_lookup", query: q }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Error al reactivar");
      }
      const r = data.reactivated;
      toast.success(
        `${r?.startup_name ?? r?.email ?? "Postulación"} reactivada. Recuperó acceso al portal (pago pendiente).`,
      );
      setQuery("");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reactivar");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <RotateCcw className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-semibold text-zinc-700">Reactivar acceso manual</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-3">
        Escribe el correo del founder o el nombre de la startup y recupera todos los
        accesos (portal + calendario). No genera cobro — el pago pendiente lo
        regulariza el founder por su cuenta.
      </p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isPending) doReactivate();
            }}
            placeholder="correo@founder.com  o  Nombre Startup"
            disabled={isPending}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 disabled:opacity-50"
          />
        </div>
        <button
          onClick={doReactivate}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Reactivar
        </button>
      </div>
    </div>
  );
}

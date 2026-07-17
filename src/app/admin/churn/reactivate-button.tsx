"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";

// Reactiva a un dado de baja SIN generar cobro. Pega al endpoint PATCH de
// applications con action=reactivate_no_charge (la UI nunca muta Airtable directo).
// El endpoint deja la postulación en "Admitida" con portal_access=true y NO toca
// Stripe: el founder regulariza su pago por su cuenta después.
export function ReactivateButton({
  recordId,
  startup,
}: {
  recordId: string;
  startup: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function doReactivate() {
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, action: "reactivate_no_charge" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Error al reactivar");
      }
      toast.success(`${startup} reactivada. Recuperó acceso al portal (pago pendiente).`);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reactivar");
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
      >
        <RotateCcw className="h-3 w-3" />
        Reactivar sin cobro
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-zinc-500 mr-1">¿Reactivar sin cobro?</span>
      <button
        onClick={doReactivate}
        disabled={isPending}
        className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg disabled:opacity-50 transition-colors"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sí"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="text-xs font-medium text-zinc-600 hover:text-zinc-800 bg-white hover:bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200 disabled:opacity-50"
      >
        No
      </button>
    </div>
  );
}

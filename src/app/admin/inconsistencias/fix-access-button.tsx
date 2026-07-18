"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

// Corrige el acceso de una startup inconsistente (Inscrita/pagada pero founders
// sin portal_access). Pega al PATCH de applications con action=fix_access.
export function FixAccessButton({
  recordId,
  startup,
}: {
  recordId: string;
  startup: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function doFix() {
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, action: "fix_access" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Error al corregir acceso");
      }
      toast.success(`${startup}: acceso restaurado. Los founders vuelven al portal y calendar.`);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo corregir");
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
      >
        <ShieldCheck className="h-3 w-3" />
        Corregir acceso
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-zinc-500 mr-1">¿Restaurar acceso?</span>
      <button
        onClick={doFix}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Editor inline del total de cuotas por founder (WI-1844). Escribe en Airtable
// vía POST /api/admin/set-cuotas y refresca el panel para que el badge
// "Cuotas sin definir" desaparezca.
export function CuotasEditor({
  postulacionId,
  cuotasPagadas,
  totalCuotas,
}: {
  postulacionId: string;
  cuotasPagadas: number;
  totalCuotas: number | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState<string>(
    totalCuotas != null ? String(totalCuotas) : "",
  );

  async function save(next: string) {
    const n = Number(next);
    if (![1, 3, 4].includes(n)) return;
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/set-cuotas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postulacionId, totalCuotas: n }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      toast.success(`Cuotas definidas: ${n}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
      setValue(totalCuotas != null ? String(totalCuotas) : "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-zinc-600">{cuotasPagadas}</span>
      <span className="text-zinc-400">/</span>
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
      ) : (
        <select
          value={value}
          onChange={(e) => save(e.target.value)}
          className={`rounded border px-1 py-0.5 text-xs ${
            value === ""
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-zinc-200 bg-white text-zinc-600"
          }`}
        >
          <option value="" disabled>
            ?
          </option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="1">1</option>
        </select>
      )}
    </span>
  );
}

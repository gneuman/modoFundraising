"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  recordId: string;
  startupName: string;
  contactName?: string;
  paymentStatus?: string | null;
  onClose: () => void;
  onSuccess?: (amountUSD: number) => void;
}

export function ManualPaymentModal({
  recordId,
  startupName,
  contactName,
  paymentStatus,
  onClose,
  onSuccess,
}: Props) {
  const cuotaSugerida =
    paymentStatus === "Cuota 1 pagada" ? 2 :
    paymentStatus === "Cuota 2 pagada" ? 3 :
    3;

  const [paying, setPaying] = useState(false);
  const [cuota, setCuota] = useState(cuotaSugerida);
  const [metodo, setMetodo] = useState("Transferencia Chile");
  const [moneda, setMoneda] = useState("USD");
  const [monto, setMonto] = useState("349");
  const [tc, setTC] = useState("");
  const [nota, setNota] = useState("");

  const montoNum = Number(monto) || 0;
  const tcNum = moneda === "USD" ? 1 : Number(tc) || 0;
  const equivalenteUSD = tcNum > 0 ? Math.round((montoNum / tcNum) * 100) / 100 : 0;
  const canConfirm = montoNum > 0 && (moneda === "USD" || tcNum > 0) && !paying;

  async function handleConfirm() {
    if (!montoNum || montoNum <= 0) { toast.error("Monto inválido"); return; }
    if (moneda !== "USD" && (!tcNum || tcNum <= 0)) { toast.error("Tipo de cambio requerido"); return; }
    setPaying(true);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          action: "mark_paid_manual",
          cuota,
          metodo,
          montoOriginal: montoNum,
          moneda,
          tipoCambio: tcNum,
          nota: nota || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success(`✅ Pago manual registrado (US$ ${data.amountUSD}) — ${startupName}`);
      onSuccess?.(data.amountUSD);
      onClose();
    } catch (err) {
      toast.error(`Error al marcar pago: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => !paying && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-800">Marcar pago manual</h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              {startupName}{contactName ? ` — ${contactName}` : ""}
            </p>
          </div>
          <button onClick={() => !paying && onClose()} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Cuota</label>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCuota(n)}
                className={cn(
                  "flex-1 h-9 rounded-lg border text-sm font-medium transition-colors",
                  cuota === n
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                )}
              >
                {n}{n === 3 ? " (completo)" : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Método</label>
          <select
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option>Transferencia Chile</option>
            <option>Transferencia USA</option>
            <option>Transferencia México</option>
            <option>Transferencia Argentina</option>
            <option>Efectivo</option>
            <option>Otro</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Monto pagado</label>
            <input
              type="number"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="349"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Moneda</label>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option>USD</option>
              <option>CLP</option>
              <option>MXN</option>
              <option>ARS</option>
              <option>Otro</option>
            </select>
          </div>
        </div>

        {moneda !== "USD" && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Tipo de cambio (1 USD = N {moneda})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={tc}
              onChange={(e) => setTC(e.target.value)}
              placeholder="1018"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-emerald-700">Equivalente en USD:</span>
            <span className="font-bold text-emerald-800 font-mono">
              {equivalenteUSD > 0 ? `US$ ${equivalenteUSD.toLocaleString()}` : "—"}
            </span>
          </div>
          <p className="text-xs text-emerald-600/80 mt-1">Este es el monto que se guardará en el historial de pagos.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nota interna (opcional)</label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ref banco, fecha de transferencia, etc."
            rows={2}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
          Al confirmar: postulación → <strong>Inscrita</strong>, portal habilitado, correo de pago enviado, invitación a Calendar.
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {paying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Procesando...</> : "Confirmar pago"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={paying} className="flex-1">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

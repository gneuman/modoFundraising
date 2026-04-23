"use client";

import { useState } from "react";
import { Loader2, CreditCard, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  token: string;
  monthlyPrice: number;
  fullPrice: number;
  fullSaving: number;
  hasDiscount: boolean;
}

export function CheckoutOptions({ token, monthlyPrice, fullPrice, fullSaving, hasDiscount }: Props) {
  const [selected, setSelected] = useState<"subscription" | "payment" | null>(null);
  const [loading, setLoading] = useState(false);

  async function pay(mode: "subscription" | "payment") {
    setSelected(mode);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, mode }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Error");
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear sesión de pago");
      setLoading(false);
      setSelected(null);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Option 1: 3 cuotas */}
      <button
        onClick={() => pay("subscription")}
        disabled={loading}
        className={cn(
          "relative flex flex-col gap-4 rounded-2xl border-2 p-6 text-left transition-all hover:shadow-md disabled:opacity-60",
          selected === "subscription"
            ? "border-blue-500 bg-blue-50 shadow-md"
            : "border-zinc-200 bg-white hover:border-blue-300"
        )}
      >
        <div className="flex items-center gap-2 text-blue-600">
          <CreditCard className="h-5 w-5" />
          <span className="font-bold text-sm uppercase tracking-wide">3 cuotas mensuales</span>
        </div>

        <div>
          <div className="text-3xl font-bold text-zinc-800">
            US${monthlyPrice.toLocaleString("en", { minimumFractionDigits: 0 })}
            <span className="text-base font-normal text-zinc-400">/mes</span>
          </div>
          {hasDiscount && (
            <p className="text-xs text-zinc-400 line-through mt-0.5">US$349/mes</p>
          )}
          <p className="text-sm text-zinc-500 mt-2">
            Total US${(monthlyPrice * 3).toLocaleString("en", { minimumFractionDigits: 0 })} · 3 cobros automáticos
          </p>
        </div>

        <p className="text-xs text-zinc-400">
          Se cobra mes a mes. Puedes cancelar antes del siguiente cobro.
        </p>

        {loading && selected === "subscription" && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-2xl">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        )}
      </button>

      {/* Option 2: Pago único */}
      <button
        onClick={() => pay("payment")}
        disabled={loading}
        className={cn(
          "relative flex flex-col gap-4 rounded-2xl border-2 p-6 text-left transition-all hover:shadow-md disabled:opacity-60",
          selected === "payment"
            ? "border-green-500 bg-green-50 shadow-md"
            : "border-zinc-200 bg-white hover:border-green-300"
        )}
      >
        {/* Best value badge */}
        <div className="absolute -top-3 right-4">
          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            {fullSaving > 0 ? `Ahorra US$${fullSaving}` : "Pago único"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-green-600">
          <Zap className="h-5 w-5" />
          <span className="font-bold text-sm uppercase tracking-wide">Pago único</span>
        </div>

        <div>
          <div className="text-3xl font-bold text-zinc-800">
            US${fullPrice.toLocaleString("en", { minimumFractionDigits: 0 })}
          </div>
          {hasDiscount && (
            <p className="text-xs text-zinc-400 line-through mt-0.5">US$1,047</p>
          )}
          <p className="text-sm text-zinc-500 mt-2">
            Un solo cobro · Acceso inmediato
          </p>
        </div>

        <p className="text-xs text-zinc-400">
          Sin renovaciones automáticas. Pago completo del programa.
        </p>

        {loading && selected === "payment" && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-2xl">
            <Loader2 className="h-6 w-6 animate-spin text-green-500" />
          </div>
        )}
      </button>
    </div>
  );
}

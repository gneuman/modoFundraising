"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CheckoutBanner() {
  const [redirecting, setRedirecting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handlePagar() {
    setRedirecting(true);
    try {
      const res = await fetch("/api/stripe/portal-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "subscription" }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Error al iniciar pago");
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar pago");
      setRedirecting(false);
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <CreditCard className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800">Tu pago está pendiente</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Completa el pago para acceder al programa completo · US$349/mes × 3 cuotas
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          onClick={handlePagar}
          disabled={redirecting}
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {redirecting ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Redirigiendo...</>
          ) : (
            "Completar pago"
          )}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-amber-100 text-amber-500 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

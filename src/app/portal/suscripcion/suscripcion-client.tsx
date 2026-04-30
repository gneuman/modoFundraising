"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentStatus } from "@/lib/airtable";
import { iniciarPago } from "./actions";

const PAGADO_STATUSES: PaymentStatus[] = ["Cuota 1 pagada", "Cuota 2 pagada", "Cuota 3 pagada"];

interface Props {
  paymentStatus: PaymentStatus;
  portalAccess?: boolean;
  stripeSubscriptionId?: string;
}

export function SuscripcionClient({ paymentStatus, portalAccess, stripeSubscriptionId }: Props) {
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // portal_access = true means payment confirmed (Stripe, manual, or beca)
  const haPagado = portalAccess || PAGADO_STATUSES.includes(paymentStatus);
  // Solo puede cancelar si tiene suscripción mensual activa y no completó las 3 cuotas
  const puedeCancel = haPagado && !!stripeSubscriptionId && paymentStatus !== "Cuota 3 pagada";

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Suscripción cancelada. Tu acceso permanecerá activo hasta el fin del período.");
      setShowConfirm(false);
      window.location.href = "/portal";
    } catch {
      toast.error("Error al cancelar la suscripción. Contacta a hello@impacta.vc");
    } finally {
      setCancelling(false);
    }
  }

  async function handleCheckout(mode: "subscription" | "payment") {
    setRedirecting(true);
    try {
      await iniciarPago(mode);
    } catch (err) {
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
      toast.error(err instanceof Error ? err.message : "Error al iniciar pago");
      setRedirecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Suscripción</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestiona tu plan en Modo Fundraising 2026</p>
      </div>

      {!haPagado ? (
        /* ── Estado: PENDIENTE ── */
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">Pago pendiente</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Tu acceso al programa Modo Fundraising 2026 está confirmado, pero tu pago está pendiente.
                  Completa el pago para activar tu acceso completo al portal.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-zinc-800">Modo Fundraising 2026</h3>
              <p className="text-sm text-zinc-500 mt-0.5">US$349 / mes · 3 cuotas</p>
            </div>

            <div className="border-t border-zinc-100 pt-4 space-y-3">
              <p className="text-sm font-medium text-zinc-700">Elige tu modalidad de pago:</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleCheckout("subscription")}
                  disabled={redirecting}
                  className="flex flex-col items-start p-4 rounded-xl border-2 border-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors text-left disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-blue-700">3 cuotas mensuales</span>
                  <span className="text-2xl font-bold text-blue-800 mt-1">US$349<span className="text-base font-medium">/mes</span></span>
                  <span className="text-xs text-blue-600 mt-1">Cobro automático · Total US$1,047</span>
                </button>

                <button
                  onClick={() => handleCheckout("payment")}
                  disabled={redirecting}
                  className="flex flex-col items-start p-4 rounded-xl border-2 border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 transition-colors text-left disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-zinc-700">Pago único</span>
                  <span className="text-2xl font-bold text-zinc-800 mt-1">US$1,047</span>
                  <span className="text-xs text-zinc-500 mt-1">Un solo cobro · Acceso completo</span>
                </button>
              </div>

              <Button
                onClick={() => handleCheckout("subscription")}
                disabled={redirecting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
              >
                {redirecting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirigiendo al pago...</>
                ) : (
                  <><ExternalLink className="h-4 w-4 mr-2" />Completar pago</>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Estado: ACTIVO ── */
        <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-zinc-800">Modo Fundraising 2026</h3>
              <p className="text-sm text-zinc-500 mt-0.5">US$349 / mes · 3 cuotas</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {paymentStatus}
            </span>
          </div>

          <div className="border-t border-zinc-100 pt-4">
            {puedeCancel && (
              <>
                <p className="text-sm text-zinc-500 mb-4">
                  Si cancelás tu suscripción, tu acceso al portal permanecerá activo hasta el final del período de facturación actual.
                </p>
                {!showConfirm ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(true)}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    Cancelar suscripción
                  </Button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">¿Confirmás la cancelación?</p>
                        <p className="text-xs text-red-600 mt-1">Perderás acceso al portal y a todas las clases y misiones.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm"
                      >
                        {cancelling ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cancelando...</> : "Sí, cancelar"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowConfirm(false)} className="text-sm">
                        No, mantener
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            {!puedeCancel && haPagado && (
              <p className="text-sm text-zinc-400">
                {paymentStatus === "Cuota 3 pagada"
                  ? "Tu programa está completamente abonado."
                  : "Pago único — sin renovaciones automáticas."}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-5">
        <p className="text-sm text-zinc-600">
          ¿Tienes preguntas sobre tu suscripción?{" "}
          <a href="mailto:hello@impacta.vc" className="text-blue-600 underline">hello@impacta.vc</a>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentStatus } from "@/lib/airtable";
import { iniciarPago } from "./actions";

const PAGADO_STATUSES: PaymentStatus[] = [
  "Cuota 1 pagada",
  "Cuota 2 pagada",
  "Cuota 3 pagada",
];

interface Props {
  paymentStatus: PaymentStatus;
  portalAccess?: boolean;
  stripeSubscriptionId?: string;
  discountPercent?: number;
  pagoFallido?: boolean;
}

type ReasonCode =
  | "precio"
  | "tiempo"
  | "prioridades"
  | "ronda_levantada"
  | "no_esperado"
  | "otro";

const REASONS: { code: ReasonCode; label: string }[] = [
  { code: "precio", label: "💸 El precio no se ajusta a mi presupuesto actual" },
  { code: "tiempo", label: "⏰ No tengo el tiempo que requiere el programa" },
  { code: "prioridades", label: "🎯 Mis prioridades cambiaron y el fundraising no es el foco ahora" },
  { code: "ronda_levantada", label: "✅ Ya levanté mi ronda" },
  { code: "no_esperado", label: "🤔 El programa no era lo que esperaba" },
  { code: "otro", label: "Otro" },
];

export function SuscripcionClient({
  paymentStatus,
  portalAccess,
  stripeSubscriptionId,
  discountPercent,
  pagoFallido,
}: Props) {
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reasonCode, setReasonCode] = useState<ReasonCode | null>(null);
  const [detail, setDetail] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [actualizandoTarjeta, setActualizandoTarjeta] = useState(false);

  async function handleActualizarTarjeta() {
    setActualizandoTarjeta(true);
    try {
      const res = await fetch("/api/portal/billing-portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Error");
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo abrir el portal de pago");
      setActualizandoTarjeta(false);
    }
  }

  const PRICE_MONTHLY = 349;
  const PRICE_ONETIME = 1047;
  const ONETIME_FULL_PRICE = 837; // Precio fijo del pago único (US$210 menos que $1,047)
  // Cuotas: solo descuento del cupón.
  const discountedMonthly = discountPercent
    ? Math.round(PRICE_MONTHLY * (1 - discountPercent / 100))
    : null;
  // Pago único: precio fijo, cupones NO aplican.
  const discountedOnetime = ONETIME_FULL_PRICE;
  const onetimeDiscount = Math.round(((PRICE_ONETIME - discountedOnetime) / PRICE_ONETIME) * 100);

  // portal_access = true means payment confirmed (Stripe, manual, or beca)
  const haPagado = portalAccess || PAGADO_STATUSES.includes(paymentStatus);
  // Cuotas completadas → nada que cancelar. El pago único llega directo a
  // "Cuota 3 pagada" desde el webhook (mode=payment), así que ese status cubre
  // tanto pago único como suscripción ya abonada: en ambos NO se muestra cancelar.
  const cuotasCompletas =
    paymentStatus === "Cuota 3 pagada" || paymentStatus === "Cuota 4 pagada";
  // Muestra el botón a toda suscripción activa (pagó y no completó cuotas).
  // NO depende de stripe_subscription_id: si el ID no se guardó en Airtable
  // (migración / webhook viejo), la cancelación se resuelve por email en el
  // endpoint. Antes ese dato faltante ocultaba el botón (WI-1818).
  const puedeCancel = haPagado && !cuotasCompletas;

  async function handleCancel() {
    if (!reasonCode) {
      toast.error("Selecciona un motivo");
      return;
    }
    if (reasonCode === "otro" && !detail.trim()) {
      toast.error("Cuéntanos brevemente el motivo");
      return;
    }
    setCancelling(true);
    try {
      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasonCode, detail: detail.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        "Suscripción cancelada. Tu acceso permanecerá activo hasta el fin del período.",
      );
      setShowConfirm(false);
      window.location.href = "/portal";
    } catch {
      toast.error(
        "Error al cancelar la suscripción. Contacta a admin@impacta.vc",
      );
    } finally {
      setCancelling(false);
    }
  }

  async function handleCheckout(mode: "subscription" | "payment") {
    setRedirecting(true);
    try {
      await iniciarPago(mode);
    } catch (err) {
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT"))
        throw err;
      toast.error(err instanceof Error ? err.message : "Error al iniciar pago");
      setRedirecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Suscripción</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Gestiona tu plan en Modo Fundraising 2026
        </p>
      </div>

      {pagoFallido && (
        /* ── Alerta: PAGO FALLIDO (tarjeta rechazada) ── */
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">Tu último pago no se pudo procesar</h3>
              <p className="text-sm text-red-700 mt-1">
                Hubo un problema al cobrar tu tarjeta. Actualiza tu método de pago
                para no perder el acceso al programa. Stripe reintentará el cobro
                automáticamente con la nueva tarjeta.
              </p>
              <Button
                onClick={handleActualizarTarjeta}
                disabled={actualizandoTarjeta}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white"
              >
                {actualizandoTarjeta ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Abriendo portal de pago...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Actualizar tarjeta
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!haPagado ? (
        /* ── Estado: PENDIENTE ── */
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">Pago pendiente</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Tu acceso al programa Modo Fundraising 2026 está confirmado,
                  pero tu pago está pendiente. Completa el pago para activar tu
                  acceso completo al portal.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-zinc-800">
                Modo Fundraising 2026
              </h3>
              <p className="text-sm text-zinc-500 mt-0.5">
                {discountedMonthly ? (
                  <>
                    US${discountedMonthly} / mes · 3 cuotas{" "}
                    <span className="line-through text-zinc-400">US$349</span> ·{" "}
                    {discountPercent}% OFF
                  </>
                ) : (
                  "US$349 / mes · 3 cuotas"
                )}
              </p>
            </div>

            <div className="border-t border-zinc-100 pt-4 space-y-3">
              {discountPercent && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 font-medium">
                  🎉 Tienes un código de {discountPercent}% off aplicado solo en
                  mensualidades. El pago único ya incluye 20% off fijo.
                </div>
              )}
              <p className="text-sm font-medium text-zinc-700">
                Elige tu modalidad de pago:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleCheckout("subscription")}
                  disabled={redirecting}
                  className="flex flex-col items-start p-4 rounded-xl border-2 border-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors text-left disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-blue-700">
                    3 cuotas mensuales
                  </span>
                  <span className="text-2xl font-bold text-blue-800 mt-1">
                    {discountedMonthly ? (
                      <>
                        US${discountedMonthly}
                        <span className="text-base font-medium">/mes</span>
                      </>
                    ) : (
                      <>
                        US$349
                        <span className="text-base font-medium">/mes</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-blue-600 mt-1">
                    {discountedMonthly ? (
                      <>
                        Cobro automático · Total US${discountedMonthly * 3}{" "}
                        <span className="line-through">US$1,047</span>
                      </>
                    ) : (
                      "Cobro automático · Total US$1,047"
                    )}
                  </span>
                </button>

                <button
                  onClick={() => handleCheckout("payment")}
                  disabled={redirecting}
                  className="relative flex flex-col items-start p-4 rounded-xl border-2 border-green-500 bg-green-50 hover:bg-green-100 transition-colors text-left disabled:opacity-50"
                >
                  <span className="absolute -top-2 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {onetimeDiscount}% OFF
                  </span>
                  <span className="text-sm font-semibold text-green-700">
                    Pago único
                  </span>
                  <span className="text-2xl font-bold text-green-800 mt-1">
                    US${discountedOnetime}
                  </span>
                  <span className="text-xs text-green-700 mt-1">
                    <span className="line-through">US$1,047</span> · 20% off
                    automático
                  </span>
                </button>
              </div>

              <Button
                onClick={() => handleCheckout("subscription")}
                disabled={redirecting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
              >
                {redirecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Redirigiendo al pago...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Completar pago
                  </>
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
              <h3 className="font-semibold text-zinc-800">
                Modo Fundraising 2026
              </h3>
              <p className="text-sm text-zinc-500 mt-0.5">
                US$349 / mes · 3 cuotas
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {paymentStatus}
            </span>
          </div>

          <div className="border-t border-zinc-100 pt-4">
            {puedeCancel && (
              <>
                <p className="text-sm text-zinc-500 mb-4">
                  Si cancelas tu suscripción, tu acceso al portal permanecerá
                  activo hasta el final del período de facturación actual.
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
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">
                          Antes de irte, cuéntanos por qué
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          Tu respuesta nos ayuda a mejorar el programa. Perderás
                          acceso al portal y a todas las clases y misiones al
                          final del período.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {REASONS.map((r) => (
                        <label
                          key={r.code}
                          className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                            reasonCode === r.code
                              ? "border-red-400 bg-white"
                              : "border-red-100 bg-white/60 hover:bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name="reason"
                            className="mt-0.5"
                            checked={reasonCode === r.code}
                            onChange={() => setReasonCode(r.code)}
                          />
                          <span className="text-zinc-700">{r.label}</span>
                        </label>
                      ))}
                    </div>

                    {reasonCode === "otro" && (
                      <textarea
                        value={detail}
                        onChange={(e) => setDetail(e.target.value)}
                        placeholder="Cuéntanos brevemente…"
                        rows={3}
                        className="w-full text-sm rounded-lg border border-red-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
                      />
                    )}

                    <div className="flex gap-3">
                      <Button
                        onClick={handleCancel}
                        disabled={cancelling || !reasonCode}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50"
                      >
                        {cancelling ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Cancelando...
                          </>
                        ) : (
                          "Sí, cancelar"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowConfirm(false);
                          setReasonCode(null);
                          setDetail("");
                        }}
                        className="text-sm"
                      >
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
          <a href="mailto:admin@impacta.vc" className="text-blue-600 underline">
            admin@impacta.vc
          </a>
        </p>
      </div>
    </div>
  );
}

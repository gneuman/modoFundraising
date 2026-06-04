"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Copy, Check, ExternalLink, CreditCard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = {
  airtableId: string;
  startup_name: string;
  email: string;
  payment_status: string;
  total_cuotas: number | null;
  portal_access: boolean;
  airtable_customer_id: string | null;
  airtable_sub_id: string | null;
  stripe: {
    customerId: string | null;
    subId: string | null;
    subStatus: string | null;
    facturasPagadas: number;
    facturasAbiertas: number;
    montoPendienteUsd: number;
    cardBrand: string | null;
    cardLast4: string | null;
  } | null;
  accion: "ok_auto" | "billing_portal" | "checkout" | "completado" | "sin_email" | "revisar";
  accion_detalle: string;
};

const ACCION_LABEL: Record<Row["accion"], { label: string; color: string }> = {
  billing_portal: { label: "Tarjeta falló", color: "bg-orange-100 text-orange-700 border-orange-200" },
  checkout: { label: "Generar Checkout", color: "bg-purple-100 text-purple-700 border-purple-200" },
  revisar: { label: "Revisar", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  ok_auto: { label: "Stripe cobra solo", color: "bg-green-100 text-green-700 border-green-200" },
  completado: { label: "Completado", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  sin_email: { label: "Sin email", color: "bg-red-100 text-red-700 border-red-200" },
};

export function RecuperarPagosSection() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"problema" | "todas">("problema");
  const [generated, setGenerated] = useState<Record<string, string>>({}); // airtableId → URL
  const [copiado, setCopiado] = useState<string | null>(null);
  const [generandoId, setGenerandoId] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/recuperar-pagos", { cache: "no-store" });
      if (!res.ok) throw new Error("Error cargando diagnóstico");
      const data = await res.json();
      setRows(data.rows as Row[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void cargar(); }, []);

  async function generarLink(row: Row, kind: "billing_portal" | "checkout") {
    setGenerandoId(row.airtableId);
    try {
      let amountUsd: number | undefined;
      let description: string | undefined;
      if (kind === "checkout") {
        const pagadas = row.stripe?.facturasPagadas ?? 0;
        const total = row.total_cuotas ?? 3;
        const cuotaNum = Math.min(pagadas + 1, total);
        const defaultAmount = row.stripe?.montoPendienteUsd && row.stripe.montoPendienteUsd > 0
          ? row.stripe.montoPendienteUsd
          : 349;
        const input = prompt(
          `Monto a cobrar (USD) para ${row.startup_name}\nCuota ${cuotaNum}/${total}:`,
          String(defaultAmount),
        );
        if (!input) { setGenerandoId(null); return; }
        amountUsd = Number(input);
        if (!amountUsd || amountUsd <= 0) {
          toast.error("Monto inválido");
          setGenerandoId(null);
          return;
        }
        description = `Modo Fundraising 2026 — Cuota ${cuotaNum}/${total} — ${row.startup_name}`;
      }
      const res = await fetch("/api/admin/recuperar-pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ airtableId: row.airtableId, kind, amountUsd, description }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Error generando link");
      setGenerated((g) => ({ ...g, [row.airtableId]: data.url }));
      toast.success("Link generado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error generando link");
    } finally {
      setGenerandoId(null);
    }
  }

  function copiar(id: string, url: string) {
    navigator.clipboard.writeText(url);
    setCopiado(id);
    setTimeout(() => setCopiado((c) => (c === id ? null : c)), 1500);
  }

  const filtered = filter === "problema"
    ? rows.filter((r) => r.accion === "billing_portal" || r.accion === "checkout" || r.accion === "revisar")
    : rows;

  const counts = {
    billing_portal: rows.filter((r) => r.accion === "billing_portal").length,
    checkout: rows.filter((r) => r.accion === "checkout").length,
    revisar: rows.filter((r) => r.accion === "revisar").length,
    ok_auto: rows.filter((r) => r.accion === "ok_auto").length,
    completado: rows.filter((r) => r.accion === "completado").length,
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-700">Recuperar pagos</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Diagnostica Stripe y genera link para que el founder pague (sin necesidad de portal).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-xs">
            <button
              onClick={() => setFilter("problema")}
              className={`px-3 py-1.5 transition-colors ${filter === "problema" ? "bg-zinc-800 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
            >
              Solo con problema ({counts.billing_portal + counts.checkout + counts.revisar})
            </button>
            <button
              onClick={() => setFilter("todas")}
              className={`px-3 py-1.5 transition-colors ${filter === "todas" ? "bg-zinc-800 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
            >
              Todas ({rows.length})
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void cargar()}
            disabled={loading}
            className="text-xs"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-6 py-3 bg-zinc-50 border-b border-zinc-100 text-xs">
        <span className="text-orange-700">🟠 Tarjeta falló: <b>{counts.billing_portal}</b></span>
        <span className="text-purple-700">🛒 Checkout: <b>{counts.checkout}</b></span>
        <span className="text-yellow-700">❓ Revisar: <b>{counts.revisar}</b></span>
        <span className="text-green-700">✅ Auto: <b>{counts.ok_auto}</b></span>
        <span className="text-zinc-600">✓ Completado: <b>{counts.completado}</b></span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100">
              <th className="text-left px-4 py-3 font-semibold text-zinc-600">Startup</th>
              <th className="text-left px-4 py-3 font-semibold text-zinc-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-zinc-600">Cuotas</th>
              <th className="text-left px-4 py-3 font-semibold text-zinc-600">Estado Stripe</th>
              <th className="text-left px-4 py-3 font-semibold text-zinc-600">Acción</th>
              <th className="text-left px-4 py-3 font-semibold text-zinc-600">Link</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Cargando diagnóstico de Stripe...
              </td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-400">
                {filter === "problema" ? "🎉 No hay pagos con problema." : "Sin postulaciones a mostrar."}
              </td></tr>
            )}
            {filtered.map((r) => {
              const acc = ACCION_LABEL[r.accion];
              const link = generated[r.airtableId];
              const total = r.total_cuotas ?? 3;
              const pagadas = r.stripe?.facturasPagadas ?? 0;
              return (
                <tr key={r.airtableId} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-800">{r.startup_name || "—"}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{r.email || "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 text-xs">
                    <span className="font-mono">{pagadas}/{total}</span>
                    {r.stripe?.montoPendienteUsd ? (
                      <span className="block text-red-600 mt-0.5">US${r.stripe.montoPendienteUsd.toFixed(2)} debe</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {r.stripe?.subStatus ? (
                      <span className="font-mono">{r.stripe.subStatus}</span>
                    ) : (
                      <span className="text-zinc-400">sin sub</span>
                    )}
                    {r.stripe?.cardLast4 && (
                      <span className="block text-zinc-400 mt-0.5">{r.stripe.cardBrand} **** {r.stripe.cardLast4}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${acc.color}`}>
                      {acc.label}
                    </span>
                    <span className="block text-[11px] text-zinc-500 mt-1 max-w-xs">{r.accion_detalle}</span>
                  </td>
                  <td className="px-4 py-3">
                    {link ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copiar(r.airtableId, link)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-zinc-200 hover:bg-zinc-100 text-zinc-700"
                          title={link}
                        >
                          {copiado === r.airtableId ? (
                            <><Check className="h-3 w-3 text-green-600" /> Copiado</>
                          ) : (
                            <><Copy className="h-3 w-3" /> Copiar link</>
                          )}
                        </button>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-blue-600 hover:underline"
                          title="Abrir en pestaña nueva"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : r.accion === "billing_portal" ? (
                      <Button
                        size="sm"
                        onClick={() => generarLink(r, "billing_portal")}
                        disabled={generandoId === r.airtableId}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-7"
                      >
                        {generandoId === r.airtableId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <><CreditCard className="h-3 w-3 mr-1" /> Generar</>
                        )}
                      </Button>
                    ) : r.accion === "checkout" || r.accion === "revisar" ? (
                      <Button
                        size="sm"
                        onClick={() => generarLink(r, "checkout")}
                        disabled={generandoId === r.airtableId}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7"
                      >
                        {generandoId === r.airtableId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <><AlertTriangle className="h-3 w-3 mr-1" /> Checkout</>
                        )}
                      </Button>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 text-[11px] text-zinc-500">
        <strong>Billing Portal:</strong> el founder actualiza su tarjeta y Stripe reintenta la factura automáticamente.{" "}
        <strong>Checkout:</strong> link de pago único con monto custom para la cuota faltante.
        Los links son sensibles — mándalos por canal privado (mail directo, WhatsApp).
      </div>
    </div>
  );
}

import { getAllApplications, getAllPagos } from "@/lib/airtable";
import { DollarSign, TrendingUp, CreditCard, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const PRECIO_CUOTA = 349;

export default async function RevenuePage() {
  const [apps, pagos] = await Promise.all([getAllApplications(), getAllPagos()]);

  const inscritas = apps.filter((a) => a.status === "Inscrita" || a.status === "Invitada institucional");
  const pagosTotales = pagos.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pagosConFallo = apps.filter((a) => a.payment_status === "Baja").length;
  const mrr = inscritas.length * PRECIO_CUOTA;

  const cuota1 = apps.filter((a) => a.payment_status === "Cuota 1 pagada").length;
  const cuota2 = apps.filter((a) => a.payment_status === "Cuota 2 pagada").length;
  const cuota3 = apps.filter((a) => a.payment_status === "Cuota 3 pagada").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Revenue</h1>
        <p className="text-sm text-zinc-500 mt-1">Modo Fundraising 2026 — US$349/mes × 3 cuotas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">MRR actual</p>
          </div>
          <p className="text-2xl font-bold text-green-600">US${mrr.toLocaleString()}</p>
          <p className="text-xs text-zinc-400 mt-1">{inscritas.length} startups × $349</p>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Revenue total</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">US${pagosTotales.toLocaleString()}</p>
          <p className="text-xs text-zinc-400 mt-1">{pagos.length} pagos registrados</p>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-zinc-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">ARR estimado</p>
          </div>
          <p className="text-2xl font-bold text-zinc-800">US${(mrr * 3).toLocaleString()}</p>
          <p className="text-xs text-zinc-400 mt-1">Programa de 3 cuotas</p>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Churn</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{pagosConFallo}</p>
          <p className="text-xs text-zinc-400 mt-1">startups con baja</p>
        </div>
      </div>

      {/* Progreso de cuotas */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h2 className="text-sm font-semibold text-zinc-700 mb-4">Progreso de cuotas</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Cuota 1", count: cuota1, amount: cuota1 * PRECIO_CUOTA, color: "bg-amber-500" },
            { label: "Cuota 2", count: cuota2, amount: cuota2 * PRECIO_CUOTA, color: "bg-blue-500" },
            { label: "Cuota 3", count: cuota3, amount: cuota3 * PRECIO_CUOTA, color: "bg-green-500" },
          ].map((c) => (
            <div key={c.label} className="text-center space-y-2">
              <p className="text-xs text-zinc-500 font-medium">{c.label}</p>
              <p className="text-2xl font-bold text-zinc-800">{c.count}</p>
              <p className="text-sm font-semibold text-zinc-600">US${c.amount.toLocaleString()}</p>
              {inscritas.length > 0 && (
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${c.color} rounded-full transition-all`}
                    style={{ width: `${Math.min(100, (c.count / inscritas.length) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Historial de pagos */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-700">Historial de pagos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Startup</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Cuota</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Monto</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-400">
                    No hay pagos registrados aún
                  </td>
                </tr>
              )}
              {pagos.map((p) => (
                <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-800">{p.startup_name || "—"}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{p.email || "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.cuota ? `${p.cuota}/3` : "—"}</td>
                  <td className="px-4 py-3 font-mono text-zinc-700">
                    {p.amount ? `US$${Number(p.amount).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.status === "Pagado" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}>
                      {p.status || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString("es") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

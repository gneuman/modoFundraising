import { getAllApplications, getAllPagos } from "@/lib/airtable";
import { listRecentRefunds } from "@/lib/stripe";
import { TrendingUp, AlertCircle, Undo2 } from "lucide-react";
import { RecuperarPagosSection } from "./recuperar-pagos-section";
import { RefundsYearFilter } from "./refunds-year-filter";

export const dynamic = "force-dynamic";

const PRECIO_CUOTA = 349;

function normalizeStartupName(name?: string) {
  return (name ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

const REFUND_REASON_LABEL: Record<string, string> = {
  requested_by_customer: "Pedido por el cliente",
  duplicate: "Duplicado",
  fraudulent: "Fraude",
  expired_uncaptured_charge: "Charge expirado",
};

const REFUNDS_START_YEAR = 2026;

export default async function RevenuePage({
  searchParams,
}: {
  searchParams?: Promise<{ refundsYear?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const currentYear = new Date().getUTCFullYear();
  const parsedYear = Number(params.refundsYear);
  const refundsYear =
    Number.isInteger(parsedYear) && parsedYear >= REFUNDS_START_YEAR && parsedYear <= currentYear
      ? parsedYear
      : currentYear;

  const yearStart = Math.floor(Date.UTC(refundsYear, 0, 1) / 1000);
  const yearEnd = Math.floor(Date.UTC(refundsYear + 1, 0, 1) / 1000);

  const [apps, pagos, refunds] = await Promise.all([
    getAllApplications(),
    getAllPagos(),
    listRecentRefunds({ createdGte: yearStart, createdLt: yearEnd }).catch(() => []),
  ]);
  const totalReembolsado = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
  const refundsYearOptions: number[] = [];
  for (let y = currentYear; y >= REFUNDS_START_YEAR; y--) refundsYearOptions.push(y);

  const totalCuotasByStartup = new Map<string, number>();
  apps.forEach((a) => {
    if (a.startup_name) {
      totalCuotasByStartup.set(normalizeStartupName(a.startup_name), a.total_cuotas ?? 3);
    }
  });

  const inscritas = apps.filter((a) => a.status === "Inscrita" || a.status === "Invitada institucional");
  const pagosTotales = pagos.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pagosConFallo = apps.filter((a) => a.payment_status === "Baja").length;

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
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Revenue total</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">US${pagosTotales.toLocaleString()}</p>
          <p className="text-xs text-zinc-400 mt-1">{pagos.length} pagos registrados · {inscritas.length} startups inscritas</p>
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

      {/* Recuperar pagos pendientes (Billing Portal + Checkout) */}
      <RecuperarPagosSection />

      {/* Reembolsos Stripe */}
      <div id="reembolsos" className="bg-white rounded-xl border border-zinc-200 overflow-hidden scroll-mt-6">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Undo2 className="h-4 w-4 text-rose-500" />
            <h2 className="text-sm font-semibold text-zinc-700">Reembolsos Stripe</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <RefundsYearFilter current={refundsYear} options={refundsYearOptions} />
            <span>
              {refunds.length} reembolso{refunds.length !== 1 ? "s" : ""} ·{" "}
              <span className="font-semibold text-rose-600">
                US${totalReembolsado.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>{" "}
              devueltos en {refundsYear}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Monto</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Razón</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Recibo</th>
              </tr>
            </thead>
            <tbody>
              {refunds.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-400">
                    No hay reembolsos registrados en Stripe en {refundsYear}
                  </td>
                </tr>
              )}
              {refunds.map((r) => (
                <tr key={r.refundId} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-zinc-700 text-xs">{r.email || "—"}</td>
                  <td className="px-4 py-3 font-mono text-rose-700 font-semibold">
                    US${r.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 text-xs">
                    {r.reason ? (REFUND_REASON_LABEL[r.reason] ?? r.reason) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.status === "succeeded"
                        ? "bg-rose-100 text-rose-700"
                        : r.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {r.status === "succeeded" ? "Reembolsado" : r.status === "pending" ? "Pendiente" : r.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {new Date(r.created).toLocaleDateString("es")}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.receiptUrl ? (
                      <a
                        href={r.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Ver
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  <td className="px-4 py-3 text-zinc-600">
                    {p.cuota ? `${p.cuota}/${totalCuotasByStartup.get(normalizeStartupName(p.startup_name)) ?? 3}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-700">
                    {p.amount ? `US$${Number(p.amount).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.status === "Pagado" || p.status === "paid" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}>
                      {p.status === "paid" ? "Pagado" : p.status || "—"}
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

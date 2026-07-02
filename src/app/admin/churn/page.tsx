import { getAllApplications, listRechazos, type RechazoRecord } from "@/lib/airtable";
import { listAllPagosFromStripe } from "@/lib/stripe";
import { UserMinus, AlertCircle, Clock, DollarSign } from "lucide-react";
import { ChurnFilters } from "./churn-filters";
import { RefundButton } from "./refund-button";

export const dynamic = "force-dynamic";

// Inicio del programa Modo Fundraising 2026: martes 24 de junio de 2026 UTC.
// La ventana de reembolso de 14 dias se cuenta desde aca; vence el 8-jul-2026.
const PROGRAM_START_MS = Date.UTC(2026, 5, 24);
const REFUND_WINDOW_DAYS = 14;

type ChurnStatus = "Churn" | "Churn By Founder";

interface ChurnRow {
  postulacionId: string;
  startup: string;
  founder: string;
  email: string;
  status: ChurnStatus;
  reasonLabel: string;
  reasonCode: string;
  detail: string;
  canceledAt: string | null;
  daysSinceStart: number;
  inWindow: boolean;
  amountPaid: number;
  amountRefunded: number;
  amountRefundable: number;
}

function daysBetweenUtc(fromMs: number, toMs: number): number {
  return Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

export default async function ChurnPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string; reason?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const filter = params.filter ?? "todos";
  const reasonFilter = params.reason ?? "todos";

  const [apps, rechazos, pagos] = await Promise.all([
    getAllApplications(),
    listRechazos().catch(() => [] as RechazoRecord[]),
    listAllPagosFromStripe().catch(() => []),
  ]);

  const rechazoByPostulacion = new Map<string, RechazoRecord>();
  rechazos.forEach((r) => {
    if (r.postulacion_id) rechazoByPostulacion.set(r.postulacion_id, r);
  });

  const pagosByEmail = new Map<string, { amount: number; refunded: number }>();
  pagos.forEach((p) => {
    if (!p.email) return;
    const key = p.email.toLowerCase();
    const prev = pagosByEmail.get(key) ?? { amount: 0, refunded: 0 };
    pagosByEmail.set(key, {
      amount: prev.amount + p.amount,
      refunded: prev.refunded + p.amountRefunded,
    });
  });

  const nowMs = Date.now();

  const churnApps = apps.filter(
    (a) => a.status === "Churn" || a.status === "Churn By Founder",
  );

  const rows: ChurnRow[] = churnApps.map((a) => {
    const rechazo = rechazoByPostulacion.get(a.id!);
    const canceledAtStr = rechazo?.created_at ?? null;
    const canceledMs = canceledAtStr ? Date.parse(canceledAtStr) : nowMs;
    const daysSinceStart = daysBetweenUtc(PROGRAM_START_MS, canceledMs);
    const inWindow = daysSinceStart >= 0 && daysSinceStart <= REFUND_WINDOW_DAYS;

    const emailKey = (a.email ?? "").toLowerCase();
    const pago = pagosByEmail.get(emailKey) ?? { amount: 0, refunded: 0 };
    const amountRefundable = inWindow
      ? Math.max(0, pago.amount - pago.refunded)
      : 0;

    return {
      postulacionId: a.id!,
      startup: a.startup_name ?? "—",
      founder: [a.first_name, a.last_name].filter(Boolean).join(" ") || "—",
      email: a.email ?? "—",
      status: a.status as ChurnStatus,
      reasonLabel: rechazo?.reason_label ?? "—",
      reasonCode: rechazo?.reason_code ?? "",
      detail: rechazo?.detail ?? "",
      canceledAt: canceledAtStr,
      daysSinceStart,
      inWindow,
      amountPaid: pago.amount,
      amountRefunded: pago.refunded,
      amountRefundable,
    };
  });

  const filtered = rows.filter((r) => {
    if (filter === "en_ventana" && !r.inWindow) return false;
    if (filter === "reembolsados" && r.amountRefunded <= 0) return false;
    if (filter === "fuera_ventana" && r.inWindow) return false;
    if (reasonFilter !== "todos" && r.reasonCode !== reasonFilter) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const at = a.canceledAt ? Date.parse(a.canceledAt) : 0;
    const bt = b.canceledAt ? Date.parse(b.canceledAt) : 0;
    return bt - at;
  });

  const totalChurn = rows.length;
  const enVentana = rows.filter((r) => r.inWindow).length;
  const montoEnRiesgo = rows.reduce((s, r) => s + r.amountRefundable, 0);
  const reasonCounts = new Map<string, number>();
  rows.forEach((r) => {
    if (r.reasonLabel && r.reasonLabel !== "—") {
      reasonCounts.set(r.reasonLabel, (reasonCounts.get(r.reasonLabel) ?? 0) + 1);
    }
  });
  const motivoDominante = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const reasonOptions = [...new Set(rows.map((r) => r.reasonCode).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Churn</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Startups fuera del programa · Ventana reembolso: 14 dias desde{" "}
          <strong>24-jun-2026</strong> (vence 8-jul-2026)
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <UserMinus className="h-4 w-4 text-red-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Total churn</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{totalChurn}</p>
          <p className="text-xs text-zinc-400 mt-1">startups fuera</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">En ventana 14d</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{enVentana}</p>
          <p className="text-xs text-zinc-400 mt-1">elegibles reembolso</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-purple-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Motivo dominante</p>
          </div>
          <p className="text-sm font-semibold text-purple-700 leading-tight">
            {motivoDominante ? motivoDominante[0] : "—"}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {motivoDominante
              ? `${motivoDominante[1]} de ${totalChurn} (${Math.round((motivoDominante[1] / Math.max(1, totalChurn)) * 100)}%)`
              : "sin motivos registrados"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-rose-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">En riesgo reembolso</p>
          </div>
          <p className="text-2xl font-bold text-rose-600">
            US${montoEnRiesgo.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-zinc-400 mt-1">no reembolsado aun</p>
        </div>
      </div>

      <ChurnFilters
        currentFilter={filter}
        currentReason={reasonFilter}
        reasonOptions={reasonOptions}
      />

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700">Listado</h2>
          <span className="text-xs text-zinc-400">{filtered.length} de {totalChurn}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Startup</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Founder</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Motivo</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Cancelado</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Ventana 14d</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Pagado</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Reembolsado</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Reembolsable</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Portal</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Accion</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-400">
                    Sin resultados con estos filtros
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.postulacionId} className="border-b border-zinc-50 hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-800">{r.startup}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    <div>{r.founder}</div>
                    <div className="text-xs text-zinc-400">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 text-xs max-w-xs">
                    <div>{r.reasonLabel}</div>
                    {r.detail && (
                      <div className="text-zinc-400 mt-0.5 italic">&quot;{r.detail}&quot;</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    <div>{r.canceledAt ? new Date(r.canceledAt).toLocaleDateString("es") : "—"}</div>
                    <div className="text-zinc-400">
                      {r.daysSinceStart >= 0 ? `${r.daysSinceStart}/14 dias` : "antes del inicio"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.inWindow ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {r.inWindow ? "✅ Dentro" : "❌ Vencido"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-700 text-xs">
                    US${r.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 font-mono text-rose-600 text-xs">
                    {r.amountRefunded > 0
                      ? `US$${r.amountRefunded.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-amber-700 text-xs font-semibold">
                    {r.amountRefundable > 0
                      ? `US$${r.amountRefundable.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                      🚫 Bloqueado
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RefundButton
                      email={r.email}
                      amountRefundable={r.amountRefundable}
                      startup={r.startup}
                    />
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

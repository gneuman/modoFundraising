import { Suspense, cache } from "react";
import { getAllApplications, listRechazos, type RechazoRecord, type PostulacionRecord } from "@/lib/airtable";
import { listAllPagosFromStripe } from "@/lib/stripe";
import { UserMinus, AlertCircle, Clock, DollarSign, CreditCard } from "lucide-react";
import { ChurnFilters } from "./churn-filters";
import { RefundButton } from "./refund-button";
import { ReactivateButton } from "./reactivate-button";
import { ReactivateLookup } from "./reactivate-lookup";

export const dynamic = "force-dynamic";

// Tipo de baja, derivado del status + huella de cobranza:
//  - no_pago: Churn con payment_failed_at estampado (el cron/webhook lo suspendió por no pagar)
//  - voluntaria: Churn By Founder (el founder se dio de baja él mismo)
//  - manual: Churn sin payment_failed_at (cancelación manual en Stripe / disputa)
type TipoBaja = "no_pago" | "voluntaria" | "manual";

const TIPO_BAJA_LABEL: Record<TipoBaja, string> = {
  no_pago: "No pago",
  voluntaria: "Voluntaria",
  manual: "Cancelación manual",
};

const TIPO_BAJA_CLASS: Record<TipoBaja, string> = {
  no_pago: "bg-red-100 text-red-700",
  voluntaria: "bg-amber-100 text-amber-700",
  manual: "bg-zinc-100 text-zinc-600",
};

// Inicio del programa Modo Fundraising 2026: martes 24 de junio de 2026 UTC.
// La ventana de reembolso de 14 dias se cuenta desde aca; vence el 8-jul-2026.
const PROGRAM_START_MS = Date.UTC(2026, 5, 24);
const REFUND_WINDOW_DAYS = 14;

type ChurnStatus = "Churn" | "Churn By Founder";

// Fila base: todo lo que sale de Airtable (rápido). Los montos de Stripe (lento)
// se agregan en un segundo paso vía Suspense, no bloquean el render de la tabla.
interface ChurnRowBase {
  postulacionId: string;
  startup: string;
  founder: string;
  email: string;
  status: ChurnStatus;
  tipoBaja: TipoBaja;
  paymentFailedAt: string | null;
  reasonLabel: string;
  reasonCode: string;
  detail: string;
  canceledAt: string | null;
  daysSinceStart: number;
  inWindow: boolean;
}

// Montos por fila, calculados desde Stripe. Se cruzan por email.
interface Montos {
  amountPaid: number;
  amountRefunded: number;
  amountRefundable: number;
}

function daysBetweenUtc(fromMs: number, toMs: number): number {
  return Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

// Construye las filas base SIN tocar Stripe. Solo Airtable → instantáneo.
function buildRows(
  apps: PostulacionRecord[],
  rechazos: RechazoRecord[],
): ChurnRowBase[] {
  const rechazoByPostulacion = new Map<string, RechazoRecord>();
  rechazos.forEach((r) => {
    if (r.postulacion_id) rechazoByPostulacion.set(r.postulacion_id, r);
  });

  const nowMs = Date.now();
  const churnApps = apps.filter(
    (a) => a.status === "Churn" || a.status === "Churn By Founder",
  );

  return churnApps.map((a) => {
    const rechazo = rechazoByPostulacion.get(a.id!);
    const canceledAtStr = rechazo?.created_at ?? null;
    const canceledMs = canceledAtStr ? Date.parse(canceledAtStr) : nowMs;
    const daysSinceStart = daysBetweenUtc(PROGRAM_START_MS, canceledMs);
    const inWindow = daysSinceStart >= 0 && daysSinceStart <= REFUND_WINDOW_DAYS;

    const paymentFailedAt = a.payment_failed_at ?? null;
    const tipoBaja: TipoBaja =
      a.status === "Churn By Founder"
        ? "voluntaria"
        : paymentFailedAt
          ? "no_pago"
          : "manual";

    return {
      postulacionId: a.id!,
      startup: a.startup_name ?? "—",
      founder: [a.first_name, a.last_name].filter(Boolean).join(" ") || "—",
      email: a.email ?? "—",
      status: a.status as ChurnStatus,
      tipoBaja,
      paymentFailedAt,
      reasonLabel: rechazo?.reason_label ?? "—",
      reasonCode: rechazo?.reason_code ?? "",
      detail: rechazo?.detail ?? "",
      canceledAt: canceledAtStr,
      daysSinceStart,
      inWindow,
    };
  });
}

function applyFilters(
  rows: ChurnRowBase[],
  filter: string,
  reasonFilter: string,
  tipoFilter: string,
  montosByRow: Map<string, Montos> | null,
): ChurnRowBase[] {
  const filtered = rows.filter((r) => {
    // Los filtros de dinero (en_ventana / reembolsados / fuera_ventana) dependen
    // de Stripe. Sin montos aún (skeleton), en_ventana/fuera_ventana se pueden
    // resolver con inWindow (Airtable), pero "reembolsados" no → se aplica cuando
    // ya hay montos. Antes del stream mostramos todas las filas que pasan el resto.
    if (filter === "en_ventana" && !r.inWindow) return false;
    if (filter === "fuera_ventana" && r.inWindow) return false;
    if (filter === "reembolsados") {
      const m = montosByRow?.get(r.postulacionId);
      if (!m || m.amountRefunded <= 0) return false;
    }
    if (reasonFilter !== "todos" && r.reasonCode !== reasonFilter) return false;
    if (tipoFilter !== "todos" && r.tipoBaja !== tipoFilter) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const at = a.canceledAt ? Date.parse(a.canceledAt) : 0;
    const bt = b.canceledAt ? Date.parse(b.canceledAt) : 0;
    return bt - at;
  });

  return filtered;
}

// Celda de dinero: muestra el monto, o un skeleton shimmer si aún no llegó de Stripe.
function MoneyCell({
  value,
  className = "",
  render,
}: {
  value: number | undefined;
  className?: string;
  render: (v: number) => string;
}) {
  if (value === undefined) {
    return (
      <td className="px-4 py-3">
        <div className="h-3.5 w-16 rounded bg-zinc-200 animate-pulse" />
      </td>
    );
  }
  return <td className={`px-4 py-3 font-mono text-xs ${className}`}>{render(value)}</td>;
}

// La tabla. Recibe montosByRow: si es null, las columnas de dinero muestran skeleton.
function ChurnTable({
  rows,
  totalChurn,
  montosByRow,
}: {
  rows: ChurnRowBase[];
  totalChurn: number;
  montosByRow: Map<string, Montos> | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">Listado</h2>
        <span className="text-xs text-zinc-400">{rows.length} de {totalChurn}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100">
              <th className="text-left px-4 py-3 font-semibold text-zinc-600">Startup</th>
              <th className="text-left px-4 py-3 font-semibold text-zinc-600">Founder</th>
              <th className="text-left px-4 py-3 font-semibold text-zinc-600">Tipo de baja</th>
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-zinc-400">
                  Sin resultados con estos filtros
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const m = montosByRow?.get(r.postulacionId);
              return (
                <tr key={r.postulacionId} className="border-b border-zinc-50 hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-800">{r.startup}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    <div>{r.founder}</div>
                    <div className="text-xs text-zinc-400">{r.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_BAJA_CLASS[r.tipoBaja]}`}
                    >
                      {TIPO_BAJA_LABEL[r.tipoBaja]}
                    </span>
                    {r.tipoBaja === "no_pago" && r.paymentFailedAt && (
                      <div className="text-xs text-zinc-400 mt-0.5">
                        falló {new Date(r.paymentFailedAt).toLocaleDateString("es")}
                      </div>
                    )}
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
                  <MoneyCell
                    value={m?.amountPaid}
                    className="text-zinc-700"
                    render={(v) => `US$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  />
                  <MoneyCell
                    value={m?.amountRefunded}
                    className="text-rose-600"
                    render={(v) => (v > 0 ? `US$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—")}
                  />
                  <MoneyCell
                    value={m?.amountRefundable}
                    className="text-amber-700 font-semibold"
                    render={(v) => (v > 0 ? `US$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—")}
                  />
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                      🚫 Bloqueado
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <RefundButton
                        email={r.email}
                        amountRefundable={m?.amountRefundable ?? 0}
                        startup={r.startup}
                      />
                      <ReactivateButton
                        recordId={r.postulacionId}
                        startup={r.startup}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Card de stat. Cuando value es undefined muestra skeleton (para el monto en riesgo).
function StatCard({
  icon,
  label,
  value,
  sub,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: string;
  valueClass: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-xs text-zinc-400 mt-1">{sub}</p>
    </div>
  );
}

// Skeleton para el número de "En riesgo reembolso" mientras Stripe responde.
function MoneySkeleton() {
  return <span className="inline-block h-7 w-24 rounded bg-zinc-200 animate-pulse align-middle" />;
}

// Card "En riesgo reembolso": versión skeleton (mientras carga Stripe).
function MontoRiesgoSkeleton() {
  return (
    <StatCard
      icon={<DollarSign className="h-4 w-4 text-rose-500" />}
      label="En riesgo reembolso"
      value={<MoneySkeleton />}
      sub="no reembolsado aun"
      valueClass="text-rose-600"
    />
  );
}

// Dedup: los dos componentes Suspense (card + tabla) comparten esta llamada.
// cache() memoiza por request → Stripe se pagina una sola vez, no dos.
const getPagos = cache(() => listAllPagosFromStripe().catch(() => []));

// Computa los pagos de Stripe una sola vez y los reparte por email/fila.
async function computeMontos(rowsBase: ChurnRowBase[]) {
  const pagos = await getPagos();

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

  const montosByRow = new Map<string, Montos>();
  let montoEnRiesgo = 0;
  for (const r of rowsBase) {
    const pago = pagosByEmail.get(r.email.toLowerCase()) ?? { amount: 0, refunded: 0 };
    const amountRefundable = r.inWindow ? Math.max(0, pago.amount - pago.refunded) : 0;
    montosByRow.set(r.postulacionId, {
      amountPaid: pago.amount,
      amountRefunded: pago.refunded,
      amountRefundable,
    });
    montoEnRiesgo += amountRefundable;
  }

  return { montosByRow, montoEnRiesgo };
}

// ─── Componentes async LENTOS (Stripe) ───────────────────────────────────────
// Cada uno envuelto en su propio <Suspense>: la página se renderiza con el shell
// (Airtable) y estos streamean cuando Stripe termina de paginar los charges.

async function MontoRiesgoCard({ rowsBase }: { rowsBase: ChurnRowBase[] }) {
  const { montoEnRiesgo } = await computeMontos(rowsBase);
  return (
    <StatCard
      icon={<DollarSign className="h-4 w-4 text-rose-500" />}
      label="En riesgo reembolso"
      value={`US$${montoEnRiesgo.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
      sub="no reembolsado aun"
      valueClass="text-rose-600"
    />
  );
}

async function TablaConMontos({
  rowsBase,
  filter,
  reasonFilter,
  tipoFilter,
  totalChurn,
}: {
  rowsBase: ChurnRowBase[];
  filter: string;
  reasonFilter: string;
  tipoFilter: string;
  totalChurn: number;
}) {
  const { montosByRow } = await computeMontos(rowsBase);
  const filtered = applyFilters(rowsBase, filter, reasonFilter, tipoFilter, montosByRow);
  return <ChurnTable rows={filtered} totalChurn={totalChurn} montosByRow={montosByRow} />;
}

export default async function ChurnPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string; reason?: string; tipo?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const filter = params.filter ?? "todos";
  const reasonFilter = params.reason ?? "todos";
  const tipoFilter = params.tipo ?? "todos";

  // Solo Airtable → rápido. Stripe se difiere al componente <StripeMontos>.
  const [apps, rechazos] = await Promise.all([
    getAllApplications(),
    listRechazos().catch(() => [] as RechazoRecord[]),
  ]);

  const rowsBase = buildRows(apps, rechazos);
  const totalChurn = rowsBase.length;
  const bajaPorNoPago = rowsBase.filter((r) => r.tipoBaja === "no_pago").length;
  const enVentana = rowsBase.filter((r) => r.inWindow).length;

  const reasonCounts = new Map<string, number>();
  rowsBase.forEach((r) => {
    if (r.reasonLabel && r.reasonLabel !== "—") {
      reasonCounts.set(r.reasonLabel, (reasonCounts.get(r.reasonLabel) ?? 0) + 1);
    }
  });
  const motivoDominante = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const reasonOptions = [...new Set(rowsBase.map((r) => r.reasonCode).filter(Boolean))];

  // Filas visibles antes del stream de Stripe (sin filtro "reembolsados", que
  // necesita montos). La tabla skeleton usa estas.
  const filteredBase = applyFilters(rowsBase, filter, reasonFilter, tipoFilter, null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Dados de baja</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Startups fuera del programa · Filtra por tipo de baja (no pago / voluntaria /
          manual). Ventana reembolso: 14 dias desde{" "}
          <strong>24-jun-2026</strong> (vence 8-jul-2026)
        </p>
      </div>

      <ReactivateLookup />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<UserMinus className="h-4 w-4 text-red-500" />}
          label="Total baja"
          value={totalChurn}
          sub="startups fuera"
          valueClass="text-red-600"
        />
        <StatCard
          icon={<CreditCard className="h-4 w-4 text-red-500" />}
          label="Baja por no pago"
          value={bajaPorNoPago}
          sub="reactivables"
          valueClass="text-red-600"
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          label="En ventana 14d"
          value={enVentana}
          sub="elegibles reembolso"
          valueClass="text-amber-600"
        />
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
        {/* Monto en riesgo: streamea desde Stripe, skeleton mientras carga. */}
        <Suspense fallback={<MontoRiesgoSkeleton />}>
          <MontoRiesgoCard rowsBase={rowsBase} />
        </Suspense>
      </div>

      <ChurnFilters
        currentFilter={filter}
        currentReason={reasonFilter}
        currentTipo={tipoFilter}
        reasonOptions={reasonOptions}
      />

      {/* Tabla: shell con datos de Airtable al instante; las columnas de dinero
          muestran skeleton (montosByRow=null) y se rellenan cuando Stripe responde. */}
      <Suspense
        fallback={<ChurnTable rows={filteredBase} totalChurn={totalChurn} montosByRow={null} />}
      >
        <TablaConMontos
          rowsBase={rowsBase}
          filter={filter}
          reasonFilter={reasonFilter}
          tipoFilter={tipoFilter}
          totalChurn={totalChurn}
        />
      </Suspense>
    </div>
  );
}

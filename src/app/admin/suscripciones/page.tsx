import {
  runSubsAudit,
  flagSeverity,
  FLAG_LABEL,
  FLAG_ACCION,
  type SubAuditRow,
  type SubFlag,
} from "@/lib/subs-audit";
import {
  CreditCard,
  AlertTriangle,
  Copy,
  ShieldAlert,
  FileWarning,
} from "lucide-react";
import { SubsFilter } from "./subs-filter";
import { CuotasEditor } from "./cuotas-editor";

export const dynamic = "force-dynamic";

const PRECIO_CUOTA = 349;

const SEVERITY_CLASSES: Record<"red" | "orange" | "yellow", string> = {
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  yellow: "bg-amber-100 text-amber-700",
};

function FlagBadge({ flag }: { flag: SubFlag }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_CLASSES[flagSeverity(flag)]}`}
    >
      {FLAG_LABEL[flag]}
    </span>
  );
}

export default async function SuscripcionesPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const filter = params.filter ?? "todos";

  const rows = await runSubsAudit();

  // KPIs
  const morosos = rows.filter((r) => r.flags.includes("MOROSA")).length;
  const doblesSub = rows.filter((r) => r.flags.includes("DOBLE_SUB")).length;
  const totalCuotasVacio = rows.filter((r) =>
    r.flags.includes("TOTAL_CUOTAS_VACIO"),
  ).length;
  const conAnomalia = rows.filter((r) => r.flags.length > 0).length;
  // Monto en riesgo: una cuota impaga por cada morosa (estimado conservador).
  const montoEnRiesgo = morosos * PRECIO_CUOTA;

  // Casos que requieren atención: rojo o naranja.
  const atencion = rows.filter((r) =>
    r.flags.some((f) => flagSeverity(f) !== "yellow"),
  );

  // Filtro de tabla
  const filtered =
    filter === "anomalias"
      ? rows.filter((r) => r.flags.length > 0)
      : filter === "morosos"
        ? rows.filter((r) => r.flags.includes("MOROSA"))
        : rows;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Suscripciones</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Auditoría de suscripciones — Airtable vs Stripe · {rows.length}{" "}
          founders inscritos
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">
              Morosos
            </p>
          </div>
          <p className="text-2xl font-bold text-red-600">{morosos}</p>
          <p className="text-xs text-zinc-400 mt-1">cobro atrasado</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Copy className="h-4 w-4 text-rose-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">
              Doble suscripción
            </p>
          </div>
          <p className="text-2xl font-bold text-rose-600">{doblesSub}</p>
          <p className="text-xs text-zinc-400 mt-1">cobro duplicado</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileWarning className="h-4 w-4 text-amber-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">
              Cuotas sin definir
            </p>
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {totalCuotasVacio}
          </p>
          <p className="text-xs text-zinc-400 mt-1">total_cuotas vacío</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-red-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">
              En riesgo
            </p>
          </div>
          <p className="text-2xl font-bold text-red-600">
            US$
            {montoEnRiesgo.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="text-xs text-zinc-400 mt-1">cuotas impagas (est.)</p>
        </div>
      </div>

      {/* Requieren atención */}
      {atencion.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h2 className="text-sm font-semibold text-red-700">
              Requieren atención ({atencion.length})
            </h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {atencion.map((r) => {
              const topFlag =
                r.flags.find((f) => flagSeverity(f) === "red") ??
                r.flags.find((f) => flagSeverity(f) === "orange") ??
                r.flags[0];
              return (
                <li key={r.postulacionId} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-800">
                          {r.startup}
                        </span>
                        {r.flags.map((f) => (
                          <FlagBadge key={f} flag={f} />
                        ))}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{r.email}</p>
                      <p className="text-sm text-zinc-600 mt-2">
                        {FLAG_ACCION[topFlag]}
                      </p>
                      {r.motivoFallo && (
                        <p className="text-sm text-red-700 mt-2 font-medium">
                          ⚠️ Motivo del fallo:{" "}
                          <span className="font-semibold">{r.motivoFallo}</span>
                          {r.ultimoIntento && (
                            <span className="text-red-500 font-normal">
                              {" "}
                              · último intento{" "}
                              {new Date(r.ultimoIntento).toLocaleDateString(
                                "es-MX",
                                { day: "2-digit", month: "short" },
                              )}
                            </span>
                          )}
                        </p>
                      )}
                      {r.subsStripe.length > 0 && (
                        <p className="text-xs text-zinc-400 mt-1 font-mono break-all">
                          {r.subsStripe.join("  ·  ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 text-xs text-zinc-500">
                      <div>{r.paymentStatus || "—"}</div>
                      <div className="mt-1">
                        {r.tieneTarjeta ? (
                          <span className="text-green-600 font-medium">
                            💳 tarjeta guardada
                          </span>
                        ) : (
                          <span className="text-zinc-400">sin tarjeta</span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <SubsFilter currentFilter={filter} />

      {/* Tabla completa */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700">
            Todos los inscritos
          </h2>
          <span className="text-xs text-zinc-400">
            {filtered.length} de {rows.length} · {conAnomalia} con anomalía
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">
                  Startup
                </th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">
                  Estado pago
                </th>
                <th className="text-center px-4 py-3 font-semibold text-zinc-600">
                  Cuotas
                </th>
                <th className="text-center px-4 py-3 font-semibold text-zinc-600">
                  Subs activas
                </th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">
                  Stripe
                </th>
                <th className="text-center px-4 py-3 font-semibold text-zinc-600">
                  Tarjeta
                </th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-zinc-400"
                  >
                    Sin resultados con este filtro
                  </td>
                </tr>
              )}
              {filtered.map((r: SubAuditRow) => (
                <tr
                  key={r.postulacionId}
                  className="border-b border-zinc-50 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-800">{r.startup}</div>
                    <div className="text-xs text-zinc-400">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {r.esBeca ? (
                      <span className="text-zinc-400">Beca 100%</span>
                    ) : (
                      r.paymentStatus || "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-600">
                    {r.esBeca ? (
                      <span className="text-zinc-400">—</span>
                    ) : (
                      <CuotasEditor
                        postulacionId={r.postulacionId}
                        cuotasPagadas={r.cuotasPagadas}
                        totalCuotas={r.totalCuotas}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        r.subsActivas > 1
                          ? "font-bold text-red-600"
                          : "text-zinc-600"
                      }
                    >
                      {r.subsActivas}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 font-mono max-w-[200px] truncate">
                    {r.subStatusMoroso ? (
                      <span className="text-red-600 font-semibold">
                        {r.subStatusMoroso}
                      </span>
                    ) : (
                      r.subsStripe.join(" ") || "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.tieneTarjeta ? "💳" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.flags.length === 0 ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                          OK
                        </span>
                      ) : (
                        r.flags.map((f) => <FlagBadge key={f} flag={f} />)
                      )}
                    </div>
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

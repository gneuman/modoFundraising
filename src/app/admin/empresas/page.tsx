import { getAllApplications, getEmpresasStats } from "@/lib/airtable";
import { Building2, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

const BADGE_PAGO: Record<string, string> = {
  "Cuota 3 pagada": "bg-green-100 text-green-700",
  "Cuota 2 pagada": "bg-blue-100 text-blue-700",
  "Cuota 1 pagada": "bg-amber-100 text-amber-700",
  Pendiente: "bg-zinc-100 text-zinc-500",
  Baja: "bg-red-100 text-red-600",
};

function formatUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export default async function EmpresasPage() {
  const [apps, empresasStats] = await Promise.all([getAllApplications(), getEmpresasStats()]);

  const inscritas = apps.filter((a) => a.status === "Inscrita" || a.status === "Invitada institucional");
  const statsMap = new Map(empresasStats.map((s) => [s.startupId, s]));

  const avgClases =
    empresasStats.length > 0
      ? (empresasStats.reduce((s, e) => s + e.clasesVistas, 0) / empresasStats.length).toFixed(1)
      : "0";
  const avgMisiones =
    empresasStats.length > 0
      ? (empresasStats.reduce((s, e) => s + e.misionesCompletadas, 0) / empresasStats.length).toFixed(1)
      : "0";

  const totalCapital = inscritas.reduce((sum, a) => sum + (Number(a.round_size) || 0), 0);
  const avgCapital = inscritas.length > 0 ? totalCapital / inscritas.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Empresas Inscritas</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Actividad por empresa — clases vistas y misiones completadas
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-xl">
          <Building2 className="h-4 w-4" />
          <span className="text-sm font-semibold">{inscritas.length} empresas</span>
        </div>
      </div>

      {/* Card total capital */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 opacity-80" />
          <p className="text-sm font-medium opacity-80 uppercase tracking-wide">Capital total levantando el portafolio</p>
        </div>
        <p className="text-4xl font-bold">{formatUSD(totalCapital)}</p>
        <p className="text-sm opacity-70 mt-1">
          {formatUSD(totalCapital)} total · promedio {formatUSD(Math.round(avgCapital))} por startup
        </p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Empresas inscritas</p>
          <p className="text-2xl font-bold text-zinc-800">{inscritas.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Clases vistas promedio</p>
          <p className="text-2xl font-bold text-zinc-800">{avgClases}</p>
          {empresasStats[0] && (
            <p className="text-xs text-zinc-400 mt-0.5">de {empresasStats[0].totalClases} totales</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Misiones completadas promedio</p>
          <p className="text-2xl font-bold text-zinc-800">{avgMisiones}</p>
          {empresasStats[0] && (
            <p className="text-xs text-zinc-400 mt-0.5">de {empresasStats[0].totalMisiones} totales</p>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Empresa</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">País</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Levantando</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Pago</th>
                <th className="text-center px-4 py-3 font-semibold text-zinc-600">Portal</th>
                <th className="text-center px-4 py-3 font-semibold text-zinc-600">Asistencia</th>
                <th className="text-center px-4 py-3 font-semibold text-zinc-600">Misiones</th>
                <th className="text-center px-4 py-3 font-semibold text-zinc-600">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {inscritas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                    No hay empresas inscritas aún
                  </td>
                </tr>
              )}
              {inscritas.map((a) => {
                const startupId = (a.startup_record?.[0] as string | undefined) ?? "";
                const stats = statsMap.get(startupId);
                const clasesPct = stats && stats.totalClases > 0 ? Math.round((stats.clasesVistas / stats.totalClases) * 100) : 0;
                const misionesPct = stats && stats.totalMisiones > 0 ? Math.round((stats.misionesCompletadas / stats.totalMisiones) * 100) : 0;
                const engagement = Math.round((clasesPct + misionesPct) / 2);

                return (
                  <tr key={a.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-800">{a.startup_name || "—"}</p>
                      <p className="text-xs text-zinc-400">{a.first_name} {a.last_name}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{a.startup_country_ops ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-zinc-700">
                      {a.round_size ? formatUSD(Number(a.round_size)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_PAGO[a.payment_status ?? "Pendiente"] ?? "bg-zinc-100 text-zinc-500"}`}>
                        {a.payment_status ?? "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.portal_access ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
                        {a.portal_access ? "Activo" : "Sin acceso"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold text-zinc-800">
                          {stats ? `${stats.clasesVistas} / ${stats.totalClases}` : "—"}
                        </span>
                        {stats && (
                          <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${clasesPct}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold text-zinc-800">
                          {stats ? `${stats.misionesCompletadas} / ${stats.totalMisiones}` : "—"}
                        </span>
                        {stats && (
                          <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${misionesPct}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        engagement >= 70 ? "bg-green-100 text-green-700" :
                        engagement >= 40 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-600"
                      }`}>
                        {engagement}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { getEmpresasStats } from "@/lib/airtable";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
  const empresas = await getEmpresasStats();

  const avgClases =
    empresas.length > 0
      ? (empresas.reduce((s, e) => s + e.clasesVistas, 0) / empresas.length).toFixed(1)
      : "0";
  const avgMisiones =
    empresas.length > 0
      ? (empresas.reduce((s, e) => s + e.misionesCompletadas, 0) / empresas.length).toFixed(1)
      : "0";

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
          <span className="text-sm font-semibold">{empresas.length} empresas</span>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Empresas inscritas</p>
          <p className="text-2xl font-bold text-zinc-800">{empresas.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Clases vistas promedio</p>
          <p className="text-2xl font-bold text-zinc-800">{avgClases}</p>
          {empresas[0] && (
            <p className="text-xs text-zinc-400 mt-0.5">de {empresas[0].totalClases} totales</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Misiones completadas promedio</p>
          <p className="text-2xl font-bold text-zinc-800">{avgMisiones}</p>
          {empresas[0] && (
            <p className="text-xs text-zinc-400 mt-0.5">de {empresas[0].totalMisiones} totales</p>
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
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Etapa</th>
                <th className="text-center px-4 py-3 font-semibold text-zinc-600">Clases vistas</th>
                <th className="text-center px-4 py-3 font-semibold text-zinc-600">Misiones completadas</th>
                <th className="text-center px-4 py-3 font-semibold text-zinc-600">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {empresas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-400">
                    No hay empresas inscritas aún
                  </td>
                </tr>
              )}
              {empresas
                .sort((a, b) => (b.clasesVistas + b.misionesCompletadas) - (a.clasesVistas + a.misionesCompletadas))
                .map((e) => {
                  const clasesPct = e.totalClases > 0 ? Math.round((e.clasesVistas / e.totalClases) * 100) : 0;
                  const misionesPct = e.totalMisiones > 0 ? Math.round((e.misionesCompletadas / e.totalMisiones) * 100) : 0;
                  const engagement = Math.round((clasesPct + misionesPct) / 2);

                  return (
                    <tr key={e.startupId} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-zinc-800">{e.startup_name}</td>
                      <td className="px-4 py-3 text-zinc-500">{e.startup_country_ops ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{e.startup_stage ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-zinc-800">
                            {e.clasesVistas} / {e.totalClases}
                          </span>
                          <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${clasesPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-zinc-800">
                            {e.misionesCompletadas} / {e.totalMisiones}
                          </span>
                          <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${misionesPct}%` }}
                            />
                          </div>
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

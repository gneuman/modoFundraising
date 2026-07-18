import { auditAccesoInconsistente, type TipoInconsistencia } from "@/lib/airtable";
import { AlertTriangle, ShieldAlert, Info } from "lucide-react";
import { FixAccessButton } from "./fix-access-button";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<TipoInconsistencia, string> = {
  founder_sin_acceso: "Founder sin acceso",
  postulacion_desync: "Campo desincronizado",
  startup_churn_pagada: "Startup Churn pero pagada",
};

const TIPO_CLASS: Record<TipoInconsistencia, string> = {
  founder_sin_acceso: "bg-red-100 text-red-700",
  postulacion_desync: "bg-zinc-100 text-zinc-600",
  startup_churn_pagada: "bg-amber-100 text-amber-700",
};

export default async function InconsistenciasPage() {
  const { total, inconsistentes } = await auditAccesoInconsistente();

  // Bugs reales de acceso (algún founder sin portal_access) primero.
  const bugsReales = inconsistentes.filter((i) => i.tipos.includes("founder_sin_acceso"));
  const cosmeticas = inconsistentes.filter((i) => !i.tipos.includes("founder_sin_acceso"));
  const ordenadas = [...bugsReales, ...cosmeticas];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Inconsistencias de acceso</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Startups que deberían tener acceso (Inscrita / pagada / Beca) pero cuyos founders
          lo perdieron. Nacen de doble-suscripción, becas o churns mal disparados. El churn
          legítimo por no-pago y Money Back se excluyen.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-zinc-400" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Total detectadas</p>
          </div>
          <p className="text-2xl font-bold text-zinc-700">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Bugs reales de acceso</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{bugsReales.length}</p>
          <p className="text-xs text-zinc-400 mt-1">founder sin portal_access</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-zinc-400" />
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Solo cosméticas</p>
          </div>
          <p className="text-2xl font-bold text-zinc-500">{cosmeticas.length}</p>
          <p className="text-xs text-zinc-400 mt-1">acceso real OK</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-700">Startups inconsistentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Startup</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Pago</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Founders acceso</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Acción</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    ✅ Sin inconsistencias de acceso
                  </td>
                </tr>
              )}
              {ordenadas.map((i) => {
                const esBugReal = i.tipos.includes("founder_sin_acceso");
                const conAcceso = i.foundersAccess.filter(Boolean).length;
                return (
                  <tr key={i.postulacionId} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-800">{i.startupName}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{i.email}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{i.status}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{i.paymentStatus || "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-600">
                      {conAcceso}/{i.foundersAccess.length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {i.tipos.map((t) => (
                          <span key={t} className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_CLASS[t]}`}>
                            {TIPO_LABEL[t]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {esBugReal ? (
                        <FixAccessButton recordId={i.postulacionId} startup={i.startupName} />
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
      </div>
    </div>
  );
}

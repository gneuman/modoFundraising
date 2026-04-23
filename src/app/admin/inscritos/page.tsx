import { getAllApplications } from "@/lib/airtable";
import { ExternalLink, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const BADGE_PAGO: Record<string, string> = {
  "Cuota 1 pagada": "bg-amber-100 text-amber-700",
  "Cuota 2 pagada": "bg-blue-100 text-blue-700",
  "Cuota 3 pagada": "bg-green-100 text-green-700",
  "Pendiente": "bg-zinc-100 text-zinc-500",
  "Baja": "bg-red-100 text-red-600",
};

export default async function InscritosPage() {
  const apps = await getAllApplications();
  const inscritos = apps.filter((a) => a.status === "Inscrita" || a.status === "Invitada institucional");

  const totalMRR = inscritos.reduce((sum, a) => sum + (Number(a.startup_mrr) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Inscritos</h1>
          <p className="text-sm text-zinc-500 mt-1">{inscritos.length} startups activas en el programa</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-xl">
          <Users className="h-4 w-4" />
          <span className="text-sm font-semibold">{inscritos.length} startups</span>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Startups inscritas</p>
          <p className="text-2xl font-bold text-zinc-800">{inscritos.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">MRR promedio</p>
          <p className="text-2xl font-bold text-zinc-800">
            {inscritos.length > 0 ? `$${Math.round(totalMRR / inscritos.length).toLocaleString()}` : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">MRR total portafolio</p>
          <p className="text-2xl font-bold text-green-600">${totalMRR.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Startup / Founder</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">País</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Etapa</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">MRR</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Pago</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Acceso portal</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600">Deck</th>
              </tr>
            </thead>
            <tbody>
              {inscritos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    No hay startups inscritas aún
                  </td>
                </tr>
              )}
              {inscritos.map((a) => (
                <tr key={a.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-800">{a.startup_name || "—"}</p>
                    <p className="text-xs text-zinc-400">{a.first_name} {a.last_name} · {a.email}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{a.startup_country_ops || "—"}</td>
                  <td className="px-4 py-3 text-xs text-zinc-600">{a.startup_stage || "—"}</td>
                  <td className="px-4 py-3 font-mono text-zinc-700">
                    {a.startup_mrr ? `$${Number(a.startup_mrr).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_PAGO[a.payment_status ?? "Pendiente"] ?? "bg-zinc-100 text-zinc-500"}`}>
                      {a.payment_status ?? "Pendiente"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.portal_access ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
                      {a.portal_access ? "Activo" : "Sin acceso"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.deck_url ? (
                      <a href={a.deck_url as string} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs">
                        Ver <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : "—"}
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

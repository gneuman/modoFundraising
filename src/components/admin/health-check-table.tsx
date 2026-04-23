"use client";

import type { ApplicationRecord } from "@/lib/airtable";
import { cn } from "@/lib/utils";

type HealthLevel = "green" | "yellow" | "red";

function dot(level: HealthLevel) {
  return (
    <span
      className={cn(
        "inline-block w-2.5 h-2.5 rounded-full",
        level === "green" && "bg-green-500",
        level === "yellow" && "bg-amber-400",
        level === "red" && "bg-red-500"
      )}
    />
  );
}

function paymentHealth(status: string | undefined): HealthLevel {
  if (!status || status === "Cuota 1 pagada" || status === "Cuota 2 pagada" || status === "Cuota 3 pagada") return "green";
  if (status === "Pendiente") return "yellow";
  return "red";
}

export function HealthCheckTable({ startups }: { startups: ApplicationRecord[] }) {
  if (!startups.length) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-zinc-400 text-sm">
        No hay startups inscritas aún
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50">
            <th className="text-left px-4 py-3 font-semibold text-zinc-600">Startup</th>
            <th className="text-left px-4 py-3 font-semibold text-zinc-600">País</th>
            <th className="text-center px-4 py-3 font-semibold text-zinc-600">Pagos</th>
            <th className="text-center px-4 py-3 font-semibold text-zinc-600">Portal</th>
            <th className="text-left px-4 py-3 font-semibold text-zinc-600">Estado</th>
          </tr>
        </thead>
        <tbody>
          {startups.map((s) => {
            const pHealth = paymentHealth(s.payment_status);
            const portalHealth: HealthLevel = s.portal_access ? "green" : "red";

            return (
              <tr key={s.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-800">{s.startup_name}</p>
                  <p className="text-xs text-zinc-400">{s.first_name} {s.last_name}</p>
                </td>
                <td className="px-4 py-3 text-zinc-600">{s.startup_country_ops}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {dot(pHealth)}
                    <span className="text-xs text-zinc-500">{s.payment_status ?? "Pendiente"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {dot(portalHealth)}
                    <span className="text-xs text-zinc-500">{s.portal_access ? "Activo" : "Sin acceso"}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                    s.status === "Inscrita" && "bg-green-100 text-green-700",
                    s.status === "Invitada institucional" && "bg-blue-100 text-blue-700",
                    s.status === "Churn" && "bg-red-100 text-red-700",
                  )}>
                    {s.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

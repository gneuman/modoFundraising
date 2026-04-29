"use client";

import type { ApplicationRecord } from "@/lib/airtable";
import { cn } from "@/lib/utils";

type HealthLevel = "green" | "yellow" | "red" | "gray";

function Dot({ level }: { level: HealthLevel }) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full flex-shrink-0",
        level === "green" && "bg-green-500",
        level === "yellow" && "bg-amber-400",
        level === "red" && "bg-red-500",
        level === "gray" && "bg-zinc-300"
      )}
    />
  );
}

function Badge({ label, variant }: { label: string; variant: "green" | "blue" | "red" | "orange" | "zinc" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        variant === "green" && "bg-green-100 text-green-700",
        variant === "blue" && "bg-blue-100 text-blue-700",
        variant === "red" && "bg-red-100 text-red-600",
        variant === "orange" && "bg-orange-100 text-orange-600",
        variant === "zinc" && "bg-zinc-100 text-zinc-500"
      )}
    >
      {label}
    </span>
  );
}

function paymentHealth(status: string | undefined): { level: HealthLevel; label: string } {
  if (!status || status === "Pendiente") return { level: "yellow", label: "Pendiente" };
  if (status === "Cuota 1 pagada") return { level: "yellow", label: "Cuota 1" };
  if (status === "Cuota 2 pagada") return { level: "yellow", label: "Cuota 2" };
  if (status === "Cuota 3 pagada") return { level: "green", label: "Al día ✓" };
  if (status === "Baja") return { level: "red", label: "Baja" };
  return { level: "gray", label: status };
}

function statusBadge(status: string | undefined) {
  if (status === "Inscrita") return <Badge label="Inscrita" variant="green" />;
  if (status === "Invitada institucional") return <Badge label="Institucional" variant="blue" />;
  if (status === "Churn") return <Badge label="Churn" variant="red" />;
  return <Badge label={status ?? "—"} variant="zinc" />;
}

export function HealthCheckTable({ startups }: { startups: ApplicationRecord[] }) {
  if (!startups.length) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-10 text-center">
        <p className="text-zinc-400 text-sm">No hay startups inscritas aún</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Startup</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">País</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Industria</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pagos</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Portal</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {startups.map((s) => {
              const pmt = paymentHealth(s.payment_status);
              const portalLevel: HealthLevel = s.portal_access ? "green" : "red";

              return (
                <tr key={s.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-zinc-900">{s.startup_name || "—"}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {s.first_name} {s.last_name}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-zinc-600 text-sm">
                    {s.startup_country_ops || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-zinc-500 line-clamp-1">
                      {s.startup_industries || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <Dot level={pmt.level} />
                      <span className="text-xs text-zinc-600">{pmt.label}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <Dot level={portalLevel} />
                      <span className="text-xs text-zinc-600">
                        {s.portal_access ? "Activo" : "Sin acceso"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {statusBadge(s.status)}
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

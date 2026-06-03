"use client";

import type { ApplicationRecord, EmpresaStats } from "@/lib/airtable";
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

function Badge({ label, variant }: { label: string; variant: "green" | "blue" | "red" | "orange" | "purple" | "zinc" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        variant === "green" && "bg-green-100 text-green-700",
        variant === "blue" && "bg-blue-100 text-blue-700",
        variant === "red" && "bg-red-100 text-red-600",
        variant === "orange" && "bg-orange-100 text-orange-600",
        variant === "purple" && "bg-purple-100 text-purple-700",
        variant === "zinc" && "bg-zinc-100 text-zinc-500"
      )}
    >
      {label}
    </span>
  );
}

function progressHealth(done: number, total: number): HealthLevel {
  if (total === 0) return "gray";
  const pct = done / total;
  if (pct >= 0.75) return "green";
  if (pct >= 0.4) return "yellow";
  return "red";
}

// Una inscrita por beca 100% no pagó realmente. Detección directa por payment_status
// "Beca 100%"; respaldo heurístico (discount 100% + sin cuota) para becas previas
// a la migración del campo.
function esBeca100(s: ApplicationRecord): boolean {
  if (s.payment_status === "Beca 100%") return true;
  const pagadas: (string | undefined)[] = ["Cuota 1 pagada", "Cuota 2 pagada", "Cuota 3 pagada"];
  return Number(s.discount_percent) === 100 && !pagadas.includes(s.payment_status);
}

function statusBadge(s: ApplicationRecord) {
  if (s.status === "Inscrita") {
    if (esBeca100(s)) return <Badge label="Beca 100%" variant="purple" />;
    return <Badge label="Inscrita" variant="green" />;
  }
  if (s.status === "Invitada institucional") return <Badge label="Institucional" variant="blue" />;
  if (s.status === "Churn") return <Badge label="Churn" variant="red" />;
  return <Badge label={s.status ?? "—"} variant="zinc" />;
}

export function HealthCheckTable({
  startups,
  empresasStats,
}: {
  startups: ApplicationRecord[];
  empresasStats: EmpresaStats[];
}) {
  if (!startups.length) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-10 text-center">
        <p className="text-zinc-400 text-sm">No hay startups inscritas aún</p>
      </div>
    );
  }

  const statsMap = new Map(empresasStats.map((s) => [s.startupId, s]));

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Startup</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">País</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Asistencia</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Misiones</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {startups.map((s) => {
              const startupId = (s.startup_record?.[0] as string | undefined) ?? "";
              const stats = statsMap.get(startupId);
              const asistLevel = stats ? progressHealth(stats.clasesVistas, stats.totalClases) : "gray";
              const misionLevel = stats ? progressHealth(stats.misionesCompletadas, stats.totalMisiones) : "gray";

              const asistLabel = stats
                ? `${stats.clasesVistas}/${stats.totalClases}`
                : "—";
              const misionLabel = stats
                ? `${stats.misionesCompletadas}/${stats.totalMisiones}`
                : "—";

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
                    <div className="flex items-center justify-center gap-1.5">
                      <Dot level={asistLevel} />
                      <span className="text-xs text-zinc-600">{asistLabel}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <Dot level={misionLevel} />
                      <span className="text-xs text-zinc-600">{misionLabel}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {statusBadge(s)}
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

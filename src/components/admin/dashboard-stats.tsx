"use client";

import { Globe, Rocket } from "lucide-react";

interface Props {
  countryCounts: Record<string, number>;
  totalInscritas: number;
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
        <span className={`flex items-center justify-center w-8 h-8 rounded-xl ${accent}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold text-zinc-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
      {children}
    </h3>
  );
}

export function DashboardStats({ countryCounts, totalInscritas }: Props) {
  // Todos los países con inscritas, de mayor a menor (antes se cortaba a top 6;
  // la clienta necesita ver los ~10 países reales de Airtable — OP-2158).
  const countries = Object.entries(countryCounts).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-8">
      {/* ── PROGRAMA ─────────────────────────────────────────── */}
      <div>
        <SectionLabel>Programa</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Inscritas"
            value={totalInscritas}
            sub="startups dentro del programa"
            icon={Rocket}
            accent="bg-violet-50 text-violet-500"
          />
        </div>
      </div>

      {/* ── PAÍSES ───────────────────────────────────────────── */}
      {countries.length > 0 && (
        <div>
          <SectionLabel>Distribución geográfica</SectionLabel>
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Globe className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-700">
                Países de origen — startups inscritas ({countries.length})
              </span>
            </div>
            <div className="space-y-3">
              {countries.map(([country, count]) => {
                const pct = totalInscritas > 0 ? Math.round((count / totalInscritas) * 100) : 0;
                return (
                  <div key={country} className="flex items-center gap-4">
                    <span className="text-sm text-zinc-700 w-36 truncate font-medium">{country}</span>
                    <div className="flex-1 bg-zinc-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 w-10 text-right tabular-nums">{pct}%</span>
                    <span className="text-sm font-semibold text-zinc-700 w-4 text-right tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

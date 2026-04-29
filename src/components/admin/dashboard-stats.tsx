"use client";

import {
  Users,
  UserCheck,
  TrendingUp,
  TrendingDown,
  DollarSign,
  GraduationCap,
  XCircle,
  UserX,
  CalendarDays,
  Globe,
  Gift,
  Percent,
} from "lucide-react";

interface Props {
  total: number;
  nuevas: number;
  admitidas: number;
  inscritas: number;
  foundersInscritos: number;
  rechazadas: number;
  rechazadasPorFounder: number;
  churn: number;
  revenue: number;
  paganFull: number;
  conBeca100: number;
  conBecaParcial: number;
  countryCounts: Record<string, number>;
  totalInscritas: number;
  proximaClase: { titulo: string; fecha?: string } | null;
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

export function DashboardStats({
  total,
  nuevas,
  admitidas,
  inscritas,
  foundersInscritos,
  rechazadas,
  rechazadasPorFounder,
  churn,
  revenue,
  paganFull,
  conBeca100,
  conBecaParcial,
  countryCounts,
  totalInscritas,
  proximaClase,
}: Props) {
  const topCountries = Object.entries(countryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("es", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="space-y-8">

      {/* ── PROGRAMA ─────────────────────────────────────────── */}
      <div>
        <SectionLabel>Programa</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Postulaciones"
            value={total}
            sub={`${nuevas > 0 ? `${nuevas} sin revisar` : "Al día"}`}
            icon={Users}
            accent="bg-zinc-100 text-zinc-500"
          />
          <KpiCard
            label="Admitidas"
            value={admitidas}
            sub="pendiente de pago"
            icon={UserCheck}
            accent="bg-blue-50 text-blue-500"
          />
          <KpiCard
            label="Startups inscritas"
            value={inscritas}
            sub="con acceso activo"
            icon={TrendingUp}
            accent="bg-green-50 text-green-600"
          />
          <KpiCard
            label="Founders inscritos"
            value={foundersInscritos}
            sub="usuarios con portal"
            icon={GraduationCap}
            accent="bg-emerald-50 text-emerald-600"
          />
        </div>
      </div>

      {/* ── REVENUE ──────────────────────────────────────────── */}
      <div>
        <SectionLabel>Revenue</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Revenue cobrado"
            value={`US$${revenue.toLocaleString()}`}
            sub="total acumulado"
            icon={DollarSign}
            accent="bg-green-50 text-green-600"
          />
          <KpiCard
            label="Pagan precio full"
            value={paganFull}
            sub="sin descuento"
            icon={Percent}
            accent="bg-violet-50 text-violet-600"
          />
          <KpiCard
            label="Beca parcial"
            value={conBecaParcial}
            sub="descuento aplicado"
            icon={Gift}
            accent="bg-indigo-50 text-indigo-500"
          />
          <KpiCard
            label="Beca 100%"
            value={conBeca100}
            sub="sin costo"
            icon={Gift}
            accent="bg-sky-50 text-sky-500"
          />
        </div>
      </div>

      {/* ── BAJAS Y PRÓXIMA CLASE ─────────────────────────────── */}
      <div>
        <SectionLabel>Estado del programa</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Rechazadas"
            value={rechazadas}
            sub="por el equipo"
            icon={XCircle}
            accent="bg-red-50 text-red-500"
          />
          <KpiCard
            label="Rechazadas por founder"
            value={rechazadasPorFounder}
            sub="admitidas, declinaron"
            icon={UserX}
            accent="bg-orange-50 text-orange-500"
          />
          <KpiCard
            label="Churn"
            value={churn}
            sub="startups de baja"
            icon={TrendingDown}
            accent="bg-red-50 text-red-400"
          />

          {/* Próxima clase — card especial */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Próxima clase</span>
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-pink-50 text-pink-500">
                <CalendarDays className="w-4 h-4" />
              </span>
            </div>
            {proximaClase ? (
              <div>
                <p className="text-base font-bold text-zinc-900 leading-snug line-clamp-2">
                  {proximaClase.titulo}
                </p>
                {proximaClase.fecha && (
                  <p className="text-xs text-zinc-400 mt-1.5 capitalize">
                    {formatDate(proximaClase.fecha)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Sin clase programada</p>
            )}
          </div>
        </div>
      </div>

      {/* ── PAÍSES ───────────────────────────────────────────── */}
      {topCountries.length > 0 && (
        <div>
          <SectionLabel>Distribución geográfica</SectionLabel>
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Globe className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-700">
                Países de origen — startups inscritas
              </span>
            </div>
            <div className="space-y-3">
              {topCountries.map(([country, count]) => {
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

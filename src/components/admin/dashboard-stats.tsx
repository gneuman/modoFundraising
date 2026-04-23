"use client";

interface Props {
  total: number;
  nuevas: number;
  admitidas: number;
  inscritas: number;
  rechazadas: number;
  churn: number;
  revenue: number;
  countryCounts: Record<string, number>;
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <p className="text-sm text-zinc-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color ?? "text-zinc-800"}`}>{value}</p>
    </div>
  );
}

export function DashboardStats({ total, nuevas, admitidas, inscritas, rechazadas, churn, revenue, countryCounts }: Props) {
  const topCountries = Object.entries(countryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Postulaciones totales" value={total} />
        <StatCard label="Nuevas (sin revisar)" value={nuevas} color="text-amber-600" />
        <StatCard label="Admitidas" value={admitidas} color="text-blue-600" />
        <StatCard label="Inscritas" value={inscritas} color="text-green-600" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Rechazadas" value={rechazadas} color="text-red-500" />
        <StatCard label="Churn" value={churn} color="text-orange-500" />
        <StatCard label="Revenue cobrado" value={`US$${revenue.toLocaleString()}`} color="text-green-700" />
      </div>

      {topCountries.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h3 className="text-sm font-semibold text-zinc-700 mb-4">Top países — inscritas</h3>
          <div className="space-y-2">
            {topCountries.map(([country, count]) => (
              <div key={country} className="flex items-center gap-3">
                <span className="text-sm text-zinc-600 w-32 truncate">{country}</span>
                <div className="flex-1 bg-zinc-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(count / (topCountries[0][1] || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-zinc-700 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

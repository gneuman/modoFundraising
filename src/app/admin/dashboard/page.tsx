import { getAllApplications, getAllPagos } from "@/lib/airtable";
import { DashboardStats } from "@/components/admin/dashboard-stats";
import { HealthCheckTable } from "@/components/admin/health-check-table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [apps, pagos] = await Promise.all([getAllApplications(), getAllPagos()]);

  const total = apps.length;
  const nuevas = apps.filter((a) => a.status === "Nueva postulación").length;
  const admitidas = apps.filter((a) => a.status === "Admitida").length;
  const inscritas = apps.filter((a) => a.status === "Inscrita" || a.status === "Invitada institucional").length;
  const rechazadas = apps.filter((a) => a.status === "Rechazada").length;
  const churn = apps.filter((a) => a.status === "Churn").length;
  const revenue = pagos.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  // Country breakdown
  const countryCounts: Record<string, number> = {};
  apps.filter((a) => a.status === "Inscrita").forEach((a) => {
    const c = a.startup_country_ops ?? "Otro";
    countryCounts[c] = (countryCounts[c] ?? 0) + 1;
  });

  const inscritasList = apps.filter((a) =>
    a.status === "Inscrita" || a.status === "Invitada institucional"
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Modo Fundraising 2026 — Visión general</p>
      </div>

      <DashboardStats
        total={total}
        nuevas={nuevas}
        admitidas={admitidas}
        inscritas={inscritas}
        rechazadas={rechazadas}
        churn={churn}
        revenue={revenue}
        countryCounts={countryCounts}
      />

      <div>
        <h2 className="text-lg font-semibold text-zinc-800 mb-4">Health Check — Startups inscritas</h2>
        <HealthCheckTable startups={inscritasList} />
      </div>
    </div>
  );
}

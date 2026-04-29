import { getAllApplications, getAllPagos, getProximaClase, countFoundersInscritos } from "@/lib/airtable";
import { STRIPE_MODE } from "@/lib/stripe";
import { DashboardStats } from "@/components/admin/dashboard-stats";
import { HealthCheckTable } from "@/components/admin/health-check-table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [apps, pagos, proximaClase, foundersInscritos] = await Promise.all([
    getAllApplications(),
    getAllPagos(),
    getProximaClase(),
    countFoundersInscritos(),
  ]);

  const total = apps.length;
  const nuevas = apps.filter((a) => a.status === "Nueva postulación").length;
  const admitidas = apps.filter((a) => a.status === "Admitida").length;
  const inscritas = apps.filter((a) => a.status === "Inscrita" || a.status === "Invitada institucional").length;
  const rechazadas = apps.filter((a) => a.status === "Rechazada").length;
  const rechazadasPorFounder = apps.filter((a) => a.status === "Rechazada por founder").length;
  const churn = apps.filter((a) => a.status === "Churn").length;
  const revenue = pagos.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const inscritasList = apps.filter((a) => a.status === "Inscrita" || a.status === "Invitada institucional");
  const paganFull = inscritasList.filter((a) => !a.discount_percent || a.discount_percent < 100).length;
  const conBeca100 = inscritasList.filter((a) => a.discount_percent === 100).length;
  const conBecaParcial = inscritasList.filter((a) => (a.discount_percent ?? 0) > 0 && (a.discount_percent ?? 0) < 100).length;

  const countryCounts: Record<string, number> = {};
  inscritasList.forEach((a) => {
    const c = a.startup_country_ops ?? "Otro";
    countryCounts[c] = (countryCounts[c] ?? 0) + 1;
  });

  return (
    <div className="space-y-10 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">Modo Fundraising 2026 — Visión general</p>
        </div>
        {STRIPE_MODE === "test" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Stripe TEST
          </span>
        )}
      </div>

      {/* KPIs */}
      <DashboardStats
        total={total}
        nuevas={nuevas}
        admitidas={admitidas}
        inscritas={inscritas}
        foundersInscritos={foundersInscritos}
        rechazadas={rechazadas}
        rechazadasPorFounder={rechazadasPorFounder}
        churn={churn}
        revenue={revenue}
        paganFull={paganFull}
        conBeca100={conBeca100}
        conBecaParcial={conBecaParcial}
        countryCounts={countryCounts}
        totalInscritas={inscritas}
        proximaClase={proximaClase ? { titulo: proximaClase.titulo ?? "", fecha: proximaClase.fecha } : null}
      />

      {/* Health Check */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Health Check</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Estado por startup inscrita</p>
          </div>
          <span className="text-xs text-zinc-400 tabular-nums">{inscritasList.length} startup{inscritasList.length !== 1 ? "s" : ""}</span>
        </div>
        <HealthCheckTable startups={inscritasList} />
      </div>
    </div>
  );
}

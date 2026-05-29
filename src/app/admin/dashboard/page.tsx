import { getAllApplications, getAllPagos, getProximaClase, getEmpresasStats } from "@/lib/airtable";
import { STRIPE_MODE } from "@/lib/stripe";
import { DashboardStats } from "@/components/admin/dashboard-stats";
import { HealthCheckTable } from "@/components/admin/health-check-table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [apps, pagos, proximaClase] = await Promise.all([
    getAllApplications(),
    getAllPagos(),
    getProximaClase(),
  ]);
  const empresasStats = await getEmpresasStats(apps);

  const completas = apps.filter((a) => a.accept_legal_terms === true);
  const incompletas = apps.length - completas.length;
  const recibidas = completas.length;
  const nuevas = completas.filter((a) => a.status === "Nueva postulación").length;
  const admitidas = apps.filter((a) => a.status === "Admitida").length;
  const inscritas = apps.filter((a) => a.status === "Inscrita" || a.status === "Invitada institucional").length;
  const rechazadas = apps.filter((a) => a.status === "Rechazada").length;
  const rechazadasPorFounder = apps.filter((a) => a.status === "Rechazada por founder").length;
  const churn = apps.filter((a) => a.status === "Churn").length;
  const revenue = pagos.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const inscritasList = apps.filter((a) => a.status === "Inscrita" || a.status === "Invitada institucional");

  const ISO_BY_COUNTRY: Record<string, string> = {
    "argentina": "AR",
    "bolivia": "BO",
    "chile": "CL",
    "colombia": "CO",
    "costa rica": "CR",
    "cuba": "CU",
    "ecuador": "EC",
    "el salvador": "SV",
    "españa": "ES",
    "espana": "ES",
    "guatemala": "GT",
    "guinea ecuatorial": "GQ",
    "honduras": "HN",
    "mexico": "MX",
    "méxico": "MX",
    "nicaragua": "NI",
    "panama": "PA",
    "panamá": "PA",
    "paraguay": "PY",
    "peru": "PE",
    "perú": "PE",
    "puerto rico": "PR",
    "republica dominicana": "DO",
    "república dominicana": "DO",
    "uruguay": "UY",
    "venezuela": "VE",
  };

  const countryCounts: Record<string, number> = {};
  inscritasList.forEach((a) => {
    const raw = (a.startup_country_ops ?? "Otro").trim();
    const base = raw.replace(/\s*\([A-Z]{2,3}\)\s*$/, "").trim();
    const existingCode = raw.match(/\(([A-Z]{2,3})\)\s*$/)?.[1];
    const iso = existingCode ?? ISO_BY_COUNTRY[base.toLowerCase()];
    const c = iso ? `${base} (${iso})` : base || raw;
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
        total={recibidas}
        incompletas={incompletas}
        nuevas={nuevas}
        admitidas={admitidas}
        rechazadas={rechazadas}
        rechazadasPorFounder={rechazadasPorFounder}
        churn={churn}
        revenue={revenue}
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
        <HealthCheckTable startups={inscritasList} empresasStats={empresasStats} />
      </div>
    </div>
  );
}

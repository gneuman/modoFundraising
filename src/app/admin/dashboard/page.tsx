import { getAllApplications, getEmpresasStats } from "@/lib/airtable";
import { STRIPE_MODE } from "@/lib/stripe";
import { DashboardStats } from "@/components/admin/dashboard-stats";
import { HealthCheckTable } from "@/components/admin/health-check-table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const apps = await getAllApplications();
  const empresasStats = await getEmpresasStats(apps);

  // El dashboard solo muestra Inscritas + distribución geográfica + health check
  // (OP-2158: se eliminaron las tarjetas de postulaciones/admitidas/rechazadas/
  // churn/próxima clase/revenue por pedido de la clienta).
  const inscritas = apps.filter((a) => a.status === "Inscrita" || a.status === "Invitada institucional").length;
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
      <DashboardStats countryCounts={countryCounts} totalInscritas={inscritas} />

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

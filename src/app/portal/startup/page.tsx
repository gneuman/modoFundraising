export const dynamic = "force-dynamic";

import { obtenerSesion } from "@/lib/auth";
import { getFounderProfile } from "@/lib/airtable";
import { Globe, Link2, MapPin, Users, TrendingUp, DollarSign, ExternalLink } from "lucide-react";
import { StartupEditForm } from "./startup-edit-form";

export default async function StartupPage() {
  const session = await obtenerSesion();
  const profile = await getFounderProfile(session?.email ?? "");
  const startup = profile?.startup ?? null;

  if (!startup) {
    return (
      <div className="text-center py-16 text-zinc-400 text-sm">
        No se encontró información de tu startup.
      </div>
    );
  }

  const fields: { label: string; value?: string | number | null; icon?: React.ReactNode; href?: string }[] = [
    { label: "País de operación", value: startup.startup_country_ops, icon: <MapPin className="h-4 w-4" /> },
    { label: "Etapa", value: startup.startup_stage },
    { label: "Equipo", value: startup.startup_team_size ? `${startup.startup_team_size} personas` : undefined, icon: <Users className="h-4 w-4" /> },
    { label: "MRR", value: startup.startup_mrr ? `US$${startup.startup_mrr.toLocaleString("en")}` : undefined, icon: <TrendingUp className="h-4 w-4" /> },
    { label: "Ventas 12m", value: startup.startup_sales_12m ? `US$${startup.startup_sales_12m.toLocaleString("en")}` : undefined, icon: <DollarSign className="h-4 w-4" /> },
    { label: "Ronda", value: startup.round_series },
    { label: "Tamaño de ronda", value: startup.round_size ? `US$${startup.round_size.toLocaleString("en")}` : undefined },
    { label: "Runway", value: startup.runway ? `${startup.runway} meses` : undefined },
    { label: "Industrias", value: startup.startup_industries },
    { label: "Modelo de negocio", value: startup.business_model },
  ].filter((f) => f.value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">{startup.startup_name}</h1>
          {startup.startup_description && (
            <p className="text-zinc-500 text-sm mt-1 leading-relaxed max-w-2xl">{startup.startup_description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <StartupEditForm startup={startup} />
          {startup.startup_website && (
            <a href={startup.startup_website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 bg-white transition-colors">
              <Globe className="h-3.5 w-3.5" /> Web
            </a>
          )}
          {startup.startup_linkedin && (
            <a href={startup.startup_linkedin} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 bg-white transition-colors">
              <Link2 className="h-3.5 w-3.5" /> LinkedIn
            </a>
          )}
          {startup.deck_url && (
            <a href={startup.deck_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors font-medium">
              <ExternalLink className="h-3.5 w-3.5" /> Deck
            </a>
          )}
        </div>
      </div>

      {/* Datos clave */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fields.map(({ label, value, icon }) => (
          <div key={label} className="bg-white border border-zinc-200 rounded-xl p-4">
            <p className="text-xs text-zinc-400 flex items-center gap-1 mb-1">
              {icon} {label}
            </p>
            <p className="text-sm font-semibold text-zinc-800">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

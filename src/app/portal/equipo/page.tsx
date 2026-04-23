import { obtenerSesion } from "@/lib/auth";
import { getAllApplications } from "@/lib/airtable";
import { EquipoClient } from "./equipo-client";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const session = await obtenerSesion();
  const apps = await getAllApplications();
  const app = apps.find((a) => a.email === session?.email);

  if (!app?.portal_access) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h2 className="text-lg font-semibold text-zinc-700">Acceso pendiente</h2>
          <p className="text-sm text-zinc-500">Tu acceso será habilitado una vez confirmado el pago.</p>
        </div>
      </div>
    );
  }

  return (
    <EquipoClient
      founderEmail={app.email ?? ""}
      founderName={`${app.first_name ?? ""} ${app.last_name ?? ""}`.trim()}
      startupName={app.startup_name ?? ""}
      teamSize={app.startup_team_size ?? 1}
    />
  );
}

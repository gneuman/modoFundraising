import { obtenerSesion } from "@/lib/auth";
import { getFounderProfile } from "@/lib/airtable";
import { EquipoClient } from "./equipo-client";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const session = await obtenerSesion();
  const profile = await getFounderProfile(session?.email ?? "");

  return (
    <EquipoClient
      founderEmail={session?.email ?? ""}
      founderName={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()}
      startupName={profile?.startup_name ?? ""}
      team={profile?.team ?? []}
    />
  );
}

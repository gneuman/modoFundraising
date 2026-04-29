import { obtenerSesionDeHeaders as obtenerSesion } from "@/lib/auth";
import { getFounderProfile } from "@/lib/airtable";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const session = await obtenerSesion();
  const profile = await getFounderProfile(session?.email ?? "");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">
          ¡Bienvenido/a, {profile?.first_name}! 👋
        </h1>
        <p className="text-zinc-500 mt-1">{profile?.startup_name} — Modo Fundraising 2026</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500 mb-1">Estado</p>
          <p className="text-lg font-bold text-green-600">{profile?.status ?? "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500 mb-1">Pagos</p>
          <p className="text-lg font-bold text-blue-600">{profile?.payment_status ?? "Pendiente"}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500 mb-1">País</p>
          <p className="text-lg font-bold text-zinc-800">{profile?.startup_country_ops ?? "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { href: "/portal/clases", label: "Clases", desc: "Accede al calendario y grabaciones", emoji: "📚" },
          { href: "/portal/misiones", label: "Misiones", desc: "Sube tus tareas semanales", emoji: "🎯" },
          { href: "/portal/equipo", label: "Equipo", desc: "Invita a miembros de tu equipo", emoji: "👥" },
          { href: "/portal/suscripcion", label: "Suscripción", desc: "Gestiona tu plan y pagos", emoji: "💳" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all group"
          >
            <div className="text-2xl mb-2">{item.emoji}</div>
            <p className="font-semibold text-zinc-800 group-hover:text-blue-600 transition-colors">{item.label}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { obtenerSesion } from "@/lib/auth";
import { getAllApplications } from "@/lib/airtable";
import Link from "next/link";
import { CheckoutBanner } from "./checkout-banner";

export const dynamic = "force-dynamic";

const PAGADO_STATUSES = ["Cuota 1 pagada", "Cuota 2 pagada", "Cuota 3 pagada"];

export default async function PortalPage() {
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

  const haPagado = PAGADO_STATUSES.includes(app.payment_status ?? "");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">
          ¡Bienvenido/a, {app.first_name}! 👋
        </h1>
        <p className="text-zinc-500 mt-1">{app.startup_name} — Modo Fundraising 2026</p>
      </div>

      {!haPagado && <CheckoutBanner />}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500 mb-1">Estado</p>
          <p className="text-lg font-bold text-green-600">{app.status}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500 mb-1">Pagos</p>
          <p className="text-lg font-bold text-blue-600">{app.payment_status ?? "Pendiente"}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm text-zinc-500 mb-1">País</p>
          <p className="text-lg font-bold text-zinc-800">{app.startup_country_ops}</p>
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

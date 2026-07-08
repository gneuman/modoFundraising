export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { getFounderProfileCached, getClasesWithContentCached } from "@/lib/airtable";
import { PortalSidebar, PortalMobileHeader } from "@/components/portal/sidebar";
import Link from "next/link";
import { CreditCard } from "lucide-react";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const session = await obtenerSesion();
  const pathname = headersList.get("x-pathname") ?? "";
  if (!session) {
    const next = pathname.startsWith("/portal") ? pathname : "";
    redirect(next ? `/ingresar?next=${encodeURIComponent(next)}` : "/ingresar");
  }
  const isSinAcceso = pathname.includes("sin-acceso");

  if (isSinAcceso) {
    return <div className="min-h-screen bg-zinc-50">{children}</div>;
  }

  const clases = await getClasesWithContentCached();
  const showClases = clases.length > 0;
  const showMisiones = clases.some((c) =>
    c.misionesData.some((m) => m.status === "Activa")
  );
  const showRecursos = clases.some((c) => c.recursosData.length > 0);

  if (!esAdmin(session.email)) {
    const profile = await getFounderProfileCached(session.email);

    // Status que dan acceso al portal aunque el founder no tenga portal_access=true
    // (ej. inscrita por invitación institucional, o ya pagada pero el founder se
    // agregó al equipo después y nunca se le marcó portal_access en Airtable).
    const isInscrita = profile?.status === "Inscrita" || profile?.status === "Invitada institucional";
    const isAdmitida = profile?.status === "Admitida";
    const hasAccess = profile?.portal_access || isAdmitida || isInscrita;
    if (!hasAccess) redirect("/portal/sin-acceso");

    // Admitida sin pago tiene acceso completo al portal (clases y misiones
    // incluidas). El banner amarillo arriba sigue recordando el pago pendiente
    // para no perder la fricción de cobro.

    const needsPayment = isAdmitida && !profile?.portal_access;

    return (
      <div className="flex flex-col lg:flex-row h-screen bg-zinc-50">
        <PortalSidebar
          email={session.email}
          startupName={profile?.startup_name}
          needsPayment={needsPayment}
          showClases={showClases}
          showMisiones={showMisiones}
          showRecursos={showRecursos}
        />
        <PortalMobileHeader
          email={session.email}
          startupName={profile?.startup_name}
          needsPayment={needsPayment}
          showClases={showClases}
          showMisiones={showMisiones}
          showRecursos={showRecursos}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Banner de pago: solo cuando está admitida pero no ha pagado */}
          {needsPayment && (
            <div className="bg-amber-500 text-white px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span>Tu startup fue admitida. Completá el pago para activar tu acceso completo.</span>
              </div>
              <Link
                href="/portal/sin-acceso"
                className="bg-white text-amber-700 hover:bg-amber-50 text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap transition-colors self-start sm:self-auto"
              >
                Completar pago →
              </Link>
            </div>
          )}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-zinc-50">
      <PortalSidebar email={session.email} showClases={showClases} showMisiones={showMisiones} showRecursos={showRecursos} />
      <PortalMobileHeader email={session.email} showClases={showClases} showMisiones={showMisiones} showRecursos={showRecursos} />
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

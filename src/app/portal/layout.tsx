export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { getFounderProfile } from "@/lib/airtable";
import { PortalSidebar } from "@/components/portal/sidebar";
import Link from "next/link";
import { CreditCard } from "lucide-react";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const session = await obtenerSesion();
  if (!session) redirect("/auth/login");

  const pathname = headersList.get("x-pathname") ?? "";
  const isSinAcceso = pathname.includes("sin-acceso");

  if (isSinAcceso) {
    return <div className="min-h-screen bg-zinc-50">{children}</div>;
  }

  if (!esAdmin(session.email)) {
    const profile = await getFounderProfile(session.email);

    // Sin perfil o acceso revocado (Churn, rechazada, etc.) → muro
    const isAdmitida = profile?.status === "Admitida";
    const hasAccess = profile?.portal_access || isAdmitida;
    if (!hasAccess) redirect("/portal/sin-acceso");

    // Rutas bloqueadas para Admitida sin pago
    const LOCKED_PATHS = ["/portal/clases", "/portal/misiones"];
    if (isAdmitida && !profile?.portal_access && LOCKED_PATHS.some((p) => pathname.startsWith(p))) {
      redirect("/portal/sin-acceso");
    }

    return (
      <div className="flex h-screen bg-zinc-50">
        <PortalSidebar email={session.email} startupName={profile?.startup_name} needsPayment={isAdmitida && !profile?.portal_access} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Banner de pago: solo cuando está admitida pero no ha pagado */}
          {isAdmitida && !profile?.portal_access && (
            <div className="bg-amber-500 text-white px-6 py-2.5 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span>Tu startup fue admitida. Completá el pago para activar tu acceso completo.</span>
              </div>
              <Link
                href="/portal/sin-acceso"
                className="bg-white text-amber-700 hover:bg-amber-50 text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap transition-colors"
              >
                Completar pago →
              </Link>
            </div>
          )}
          <main className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-5xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50">
      <PortalSidebar email={session.email} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

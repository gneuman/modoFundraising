import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { getFounderProfile } from "@/lib/airtable";
import { PortalSidebar } from "@/components/portal/sidebar";

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
    if (!profile?.portal_access) redirect("/portal/sin-acceso");

    return (
      <div className="flex h-screen bg-zinc-50">
        <PortalSidebar email={session.email} startupName={profile.startup_name} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-5xl mx-auto">{children}</div>
        </main>
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

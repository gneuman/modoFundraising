import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { getAllApplications } from "@/lib/airtable";
import { PortalSidebar } from "@/components/portal/sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await obtenerSesion();
  if (!session) redirect("/auth/login");

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? headersList.get("x-invoke-path") ?? "";
  const isSinAcceso = pathname.includes("sin-acceso");

  if (!isSinAcceso && !esAdmin(session.email)) {
    const apps = await getAllApplications();
    const app = apps.find((a) => a.email === session.email);
    if (!app?.portal_access) redirect("/portal/sin-acceso");
  }

  // Sin-acceso page renders without the sidebar
  if (isSinAcceso) {
    return <div className="min-h-screen bg-zinc-50">{children}</div>;
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

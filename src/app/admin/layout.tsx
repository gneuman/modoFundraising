import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { obtenerSesion } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";

  // /admin/login es público — no aplica sidebar ni guard de sesión
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const session = await obtenerSesion();
  if (!session || session.role !== "admin") redirect("/admin/login");

  return (
    <div className="flex h-screen bg-zinc-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

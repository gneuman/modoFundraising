import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await obtenerSesion();
  if (!session || session.role !== "admin") redirect("/auth/login");

  return (
    <div className="flex h-screen bg-zinc-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

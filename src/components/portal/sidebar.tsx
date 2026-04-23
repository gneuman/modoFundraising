"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Target, Users, CreditCard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const NAV = [
  { href: "/portal", label: "Mi portal", icon: LayoutDashboard, exact: true },
  { href: "/portal/clases", label: "Clases", icon: BookOpen },
  { href: "/portal/misiones", label: "Misiones", icon: Target },
  { href: "/portal/equipo", label: "Equipo", icon: Users },
  { href: "/portal/suscripcion", label: "Suscripción", icon: CreditCard },
];

export function PortalSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-white border-r border-zinc-100 flex flex-col shrink-0">
      <div className="p-5 border-b border-zinc-100">
        <div className="space-y-2">
          <Image src="/logo-mf.png" alt="Modo Fundraising" width={120} height={40} className="object-contain" />
          <p className="text-xs text-zinc-400 truncate">{email}</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-zinc-100">
        <Link
          href="/api/auth/logout"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Link>
      </div>
    </aside>
  );
}

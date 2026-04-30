"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Target, Users, CreditCard, LogOut, Rocket, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const NAV = [
  { href: "/portal", label: "Mi portal", icon: LayoutDashboard, exact: true, locked: false },
  { href: "/portal/startup", label: "Mi Startup", icon: Rocket, locked: false },
  { href: "/portal/clases", label: "Clases", icon: BookOpen, locked: true },
  { href: "/portal/misiones", label: "Misiones", icon: Target, locked: true },
  { href: "/portal/equipo", label: "Equipo", icon: Users, locked: false },
  { href: "/portal/suscripcion", label: "Suscripción", icon: CreditCard, locked: false },
];

export function PortalSidebar({
  email,
  startupName,
  needsPayment = false,
}: {
  email: string;
  startupName?: string;
  needsPayment?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-white border-r border-zinc-100 flex flex-col shrink-0">
      <div className="p-5 border-b border-zinc-100">
        <div className="space-y-2">
          <Image src="/logo-mf-azul.png" alt="Modo Fundraising" width={120} height={40} className="object-contain" />
          {startupName && <p className="text-sm font-semibold text-zinc-700 truncate">{startupName}</p>}
          <div className="flex items-center gap-1.5">
            <span
              className={cn("w-2 h-2 rounded-full shrink-0", needsPayment ? "bg-amber-400" : "bg-green-500")}
              title={needsPayment ? "Pago pendiente" : "Acceso activo al portal"}
            />
            <p className="text-xs text-zinc-400 truncate">{email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon, exact, locked }) => {
          const isBlocked = needsPayment && locked;
          const active = !isBlocked && (exact ? pathname === href : pathname.startsWith(href));

          if (isBlocked) {
            return (
              <Link
                key={href}
                href="/portal/sin-acceso"
                title="Completá el pago para acceder"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 cursor-not-allowed select-none blur-[0.4px] pointer-events-auto"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{label}</span>
                <Lock className="h-3 w-3 shrink-0" />
              </Link>
            );
          }

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
        <button
          onClick={() => { window.location.href = "/api/auth/logout"; }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 transition-colors w-full text-left"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

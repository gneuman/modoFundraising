"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, BookOpen, Target, Users, CreditCard, LogOut, Rocket, Lock, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type SidebarProps = {
  email: string;
  startupName?: string;
  needsPayment?: boolean;
  showClases?: boolean;
  showMisiones?: boolean;
};

function SidebarContent({
  email,
  startupName,
  needsPayment = false,
  showClases = false,
  showMisiones = false,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  const NAV = [
    { href: "/portal", label: "Mi portal", icon: LayoutDashboard, exact: true, locked: false, hidden: false },
    { href: "/portal/startup", label: "Mi Startup", icon: Rocket, locked: false, hidden: false },
    { href: "/portal/clases", label: "Clases", icon: BookOpen, locked: true, hidden: !showClases },
    { href: "/portal/misiones", label: "Misiones", icon: Target, locked: true, hidden: !showMisiones },
    { href: "/portal/equipo", label: "Equipo", icon: Users, locked: false, hidden: false },
    { href: "/portal/suscripcion", label: "Suscripción", icon: CreditCard, locked: false, hidden: false },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
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

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.filter(({ hidden }) => !hidden).map(({ href, label, icon: Icon, exact, locked }) => {
          const isBlocked = needsPayment && locked;
          const active = !isBlocked && (exact ? pathname === href : pathname.startsWith(href));

          if (isBlocked) {
            return (
              <Link
                key={href}
                href="/portal/sin-acceso"
                onClick={onNavigate}
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
              onClick={onNavigate}
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
    </div>
  );
}

export function PortalSidebar(props: SidebarProps) {
  return (
    <aside className="hidden lg:flex w-60 bg-white border-r border-zinc-100 flex-col shrink-0">
      <SidebarContent {...props} />
    </aside>
  );
}

export function PortalMobileHeader(props: SidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar el drawer al navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 bg-white border-b border-zinc-100 px-4 h-14 shrink-0">
        <Image src="/logo-mf-azul.png" alt="Modo Fundraising" width={104} height={34} className="object-contain" />
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="flex items-center justify-center w-10 h-10 -mr-2 rounded-lg text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Drawer móvil */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Overlay */}
        <button
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        />
        {/* Panel */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl flex flex-col transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="absolute top-3 right-3 z-10 flex items-center justify-center w-9 h-9 rounded-lg text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent {...props} onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Tag,
  BookOpen,
  Target,
  Link2,
  Code2,
  LogOut,
  Building2,
  CalendarDays,
  Mail,
  Palette,
  UserMinus,
  CreditCard,
  Star,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const NAV = [
  { href: "/admin/dashboard",     label: "Dashboard",      icon: LayoutDashboard },
  { href: "/admin/postulaciones", label: "Postulaciones",  icon: FileText },
  { href: "/admin/empresas",      label: "Empresas",       icon: Building2 },
  { href: "/admin/revenue",       label: "Revenue",        icon: DollarSign },
  { href: "/admin/suscripciones", label: "Suscripciones",  icon: CreditCard },
  { href: "/admin/churn",         label: "Churn",          icon: UserMinus },
  { href: "/admin/nps",           label: "NPS sesiones",   icon: Star },
  { href: "/admin/cupones",       label: "Cupones",        icon: Tag },
  { href: "/admin/calendario",    label: "Calendario",     icon: CalendarDays },
  { href: "/admin/clases",        label: "Clases",         icon: BookOpen },
  { href: "/admin/misiones",      label: "Misiones",       icon: Target },
  // "Ponerse al día" (/admin/misiones-atrasadas, OP-1905) se oculta del menú
  // por pedido (OP-1920). La página sigue viva y accesible por URL directa.
  { href: "/admin/recursos",       label: "Recursos",        icon: Link2 },
  { href: "/admin/comunicaciones", label: "Comunicaciones",  icon: Mail },
  { href: "/admin/design",         label: "Diseño",          icon: Palette },
  { href: "/admin/guias",          label: "Guías",           icon: LifeBuoy },
  { href: "/admin/api",            label: "API Docs",        icon: Code2 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-white border-r border-zinc-100 flex flex-col shrink-0">
      <div className="p-5 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <Image src="/logo-mf-azul.png" alt="Modo Fundraising" width={120} height={40} className="object-contain" />
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-blue-50 text-blue-700"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/patients", label: "Pacientes" },
  { href: "/catalog/tests", label: "Catálogo" },
  { href: "/templates", label: "Plantillas" },
  { href: "/orders", label: "Órdenes" },
  { href: "/results", label: "Resultados" },
  { href: "/pending", label: "Pendientes" },
  { href: "/delivered", label: "Entregados" },
  { href: "/reportes", label: "Reportes" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="px-6 py-5 text-lg font-semibold text-slate-900">
        Clinica Enfoque Salud - Laboratorio
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100",
                active && "bg-slate-900 text-white hover:bg-slate-900",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 px-3 py-3">
        <Link
          href="/configuracion"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100",
            pathname.startsWith("/configuracion") && "bg-slate-900 text-white hover:bg-slate-900",
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Configuración
        </Link>
      </div>
      <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
        Laboratorio Clínico
      </div>
    </aside>
  );
}

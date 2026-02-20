"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { ADMIN_ROLE_CODE, hasPermission, PERMISSION_REPORTES } from "@/lib/auth";
import { useIsMobile } from "@/hooks/useMediaQuery";

const navItemsBase: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/patients", label: "Pacientes" },
  { href: "/catalog/tests", label: "Catálogo" },
  { href: "/promociones", label: "Promociones" },
  { href: "/templates", label: "Plantillas" },
  { href: "/orders", label: "Órdenes" },
  { href: "/results", label: "Resultados" },
  { href: "/pending", label: "Pendientes" },
  { href: "/delivered", label: "Entregados" },
  { href: "/reportes", label: "Reportes", adminOnly: true },
];

export function Sidebar({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const canSeeReportes = hasPermission(session ?? null, PERMISSION_REPORTES);
  const navItems = navItemsBase.filter((item) => !("adminOnly" in item && item.adminOnly) || canSeeReportes);

  const handleNavClick = () => {
    if (isMobile) onToggle();
  };

  return (
    <>
      {isMobile && open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onToggle}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-700/80 dark:bg-slate-800/95 backdrop-blur-sm transition-all duration-200 ease-out",
        !isMobile && (open ? "w-64 min-w-64" : "w-0 min-w-0 border-r-0"),
        isMobile && "fixed inset-y-0 left-0 z-50 w-64 min-w-0 max-w-[85vw]",
        isMobile && (open ? "translate-x-0" : "-translate-x-full"),
      )}
    >
      <div className={cn("flex h-full min-w-64 flex-col", !open && !isMobile && "invisible")}>
      <div className="border-t-2 border-teal-500 px-5 py-5 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Clinica Enfoque Salud - Laboratorio
      </div>
      <nav className="flex-1 space-y-0.5 px-2.5 py-2">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                "block rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/80 dark:hover:text-slate-100",
                active &&
                  "bg-teal-600 text-white hover:bg-teal-700 hover:text-white dark:bg-teal-600 dark:hover:bg-teal-500 shadow-sm",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {session?.user?.roleCode === ADMIN_ROLE_CODE && (
        <div className="border-t border-slate-200/80 px-2.5 py-3 dark:border-slate-700/80">
          <Link
            href="/configuracion"
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/80 dark:hover:text-slate-100",
              pathname.startsWith("/configuracion") &&
                "bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 shadow-sm",
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Configuración
          </Link>
        </div>
      )}
      <div className="border-t border-slate-200/80 px-5 py-4 text-xs text-slate-500 dark:border-slate-700/80 dark:text-slate-400">
        Laboratorio Clínico
      </div>
      </div>
    </aside>
    </>
  );
}

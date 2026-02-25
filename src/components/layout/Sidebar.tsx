"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ComponentType } from "react";
import {
  BarChart3,
  ClipboardList,
  DollarSign,
  FileText,
  FlaskConical,
  Home,
  Settings,
  ShoppingBag,
  Tags,
  TestTube2,
  UserRound,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ADMIN_ROLE_CODE,
  hasAnyPermission,
  hasPermission,
  hasRoleWithPermissions,
  PERMISSION_CAPTURAR_RESULTADOS,
  PERMISSION_EDITAR_PACIENTES,
  PERMISSION_EDITAR_PRECIO_CATALOGO,
  PERMISSION_GESTIONAR_ADMISION,
  PERMISSION_GESTIONAR_CATALOGO,
  PERMISSION_GESTIONAR_PLANTILLAS,
  PERMISSION_IMPRIMIR_RESULTADOS,
  PERMISSION_QUICK_ACTIONS_ANALISTA,
  PERMISSION_QUICK_ACTIONS_ENTREGA,
  PERMISSION_QUICK_ACTIONS_RECEPCION,
  PERMISSION_REGISTRAR_PAGOS,
  PERMISSION_REPORTES,
  PERMISSION_VALIDAR_RESULTADOS,
  PERMISSION_VER_ADMISION,
  PERMISSION_VER_CATALOGO,
  PERMISSION_VER_CONFIGURACION,
  PERMISSION_VER_ORDENES,
  PERMISSION_VER_PACIENTES,
  PERMISSION_VER_PAGOS,
} from "@/lib/auth";
import { useIsMobile } from "@/hooks/useMediaQuery";

/** Permisos requeridos por ítem: si tiene al menos uno, puede verlo. Vacío = siempre visible (Dashboard). */
const navItemsBase: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  requiredPermissions: string[];
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, requiredPermissions: [] },
  {
    href: "/patients",
    label: "Pacientes",
    icon: Users,
    requiredPermissions: [PERMISSION_VER_PACIENTES, PERMISSION_EDITAR_PACIENTES],
  },
  {
    href: "/catalog/tests",
    label: "Catálogo",
    icon: FlaskConical,
    requiredPermissions: [PERMISSION_VER_CATALOGO, PERMISSION_GESTIONAR_CATALOGO, PERMISSION_EDITAR_PRECIO_CATALOGO],
  },
  {
    href: "/promociones",
    label: "Promociones",
    icon: Tags,
    requiredPermissions: [PERMISSION_VER_CATALOGO, PERMISSION_GESTIONAR_CATALOGO],
  },
  {
    href: "/templates",
    label: "Plantillas",
    icon: TestTube2,
    requiredPermissions: [PERMISSION_GESTIONAR_PLANTILLAS, PERMISSION_CAPTURAR_RESULTADOS],
  },
  {
    href: "/orders",
    label: "Órdenes",
    icon: ClipboardList,
    requiredPermissions: [
      PERMISSION_VER_ORDENES,
      PERMISSION_QUICK_ACTIONS_RECEPCION,
      PERMISSION_QUICK_ACTIONS_ANALISTA,
      PERMISSION_QUICK_ACTIONS_ENTREGA,
      PERMISSION_GESTIONAR_ADMISION,
      PERMISSION_VER_ADMISION,
    ],
  },
  {
    href: "/admisiones",
    label: "Admisión",
    icon: UserPlus,
    requiredPermissions: [PERMISSION_VER_ADMISION, PERMISSION_GESTIONAR_ADMISION],
  },
  {
    href: "/cobro-admision",
    label: "Cobro admisión",
    icon: DollarSign,
    requiredPermissions: [PERMISSION_VER_ADMISION],
  },
  {
    href: "/pagos",
    label: "Pagos",
    icon: Wallet,
    requiredPermissions: [PERMISSION_VER_PAGOS, PERMISSION_REGISTRAR_PAGOS],
  },
  {
    href: "/results",
    label: "Resultados",
    icon: FileText,
    requiredPermissions: [PERMISSION_CAPTURAR_RESULTADOS, PERMISSION_VALIDAR_RESULTADOS, PERMISSION_IMPRIMIR_RESULTADOS],
  },
  {
    href: "/pending",
    label: "Pendientes",
    icon: ShoppingBag,
    requiredPermissions: [PERMISSION_VER_ORDENES, PERMISSION_QUICK_ACTIONS_ANALISTA, PERMISSION_CAPTURAR_RESULTADOS],
  },
  {
    href: "/delivered",
    label: "Entregados",
    icon: UserRound,
    requiredPermissions: [PERMISSION_VER_ORDENES, PERMISSION_QUICK_ACTIONS_ENTREGA],
  },
  {
    href: "/reportes",
    label: "Reportes",
    icon: BarChart3,
    requiredPermissions: [PERMISSION_REPORTES],
  },
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
  const hasRole = hasRoleWithPermissions(session ?? null);
  const isAdmin = session?.user?.roleCode === ADMIN_ROLE_CODE;
  const navItems = navItemsBase.filter((item) => {
    if (item.requiredPermissions.length === 0) return true; // Dashboard siempre visible
    if (!hasRole) return false; // Sin rol/permisos: solo Dashboard
    if (isAdmin) return true; // Administrador accede a todo
    return hasAnyPermission(session ?? null, item.requiredPermissions);
  });

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
        "sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/60 backdrop-blur-md transition-all duration-300 ease-out dark:border-slate-700/80 dark:bg-slate-900/95 dark:shadow-slate-950/30",
        !isMobile && (open ? "w-64 min-w-64" : "w-0 min-w-0 border-r-0"),
        isMobile && "fixed inset-y-0 left-0 z-50 w-[min(16rem,85vw)]",
        isMobile && (open ? "translate-x-0" : "-translate-x-full"),
      )}
    >
      <div className={cn("flex h-full min-w-0 flex-1 flex-col overflow-hidden", !open && !isMobile && "invisible")}>
      <div className="shrink-0 border-b border-slate-200/80 bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-4 text-white dark:border-slate-700/80 sm:px-5 sm:py-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/80">Sistema</p>
        <p className="mt-1 truncate text-sm font-semibold tracking-tight sm:text-base">Clínica Enfoque Salud</p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-2.5 py-1 text-[11px]">
          <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
          Laboratorio en línea
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                "text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:translate-x-0.5 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                active &&
                  "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-600/30 hover:translate-x-0 dark:from-teal-600 dark:to-cyan-500",
              )}
            >
              {!active && (
                <span className="absolute left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r-full bg-teal-500 opacity-0 transition-all duration-200 group-hover:h-5 group-hover:opacity-100" />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  active ? "text-white" : "text-slate-400 group-hover:text-teal-600 dark:text-slate-500 dark:group-hover:text-teal-400",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {(session?.user?.roleCode === ADMIN_ROLE_CODE || hasPermission(session ?? null, PERMISSION_VER_CONFIGURACION)) && (
        <div className="border-t border-slate-200/80 px-2.5 py-3 dark:border-slate-700/80">
          <Link
            href="/configuracion"
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
              "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
              pathname.startsWith("/configuracion") &&
                "bg-gradient-to-r from-teal-600 to-cyan-600 text-white dark:from-teal-600 dark:to-cyan-500 shadow-md shadow-teal-600/30",
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Configuración
          </Link>
        </div>
      )}

      </div>
    </aside>
    </>
  );
}

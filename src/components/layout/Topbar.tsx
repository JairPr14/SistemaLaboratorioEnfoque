"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, PanelLeft, PanelLeftClose, Settings } from "lucide-react";
import { GlobalSearch } from "@/components/dashboard/GlobalSearch";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ADMIN_ROLE_CODE } from "@/lib/auth";

export function Topbar({
  sidebarOpen,
  onToggleSidebar,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between border border-slate-200/80 border-b-2 border-b-teal-500/70 bg-white/90 px-5 py-4 sm:px-6 dark:border-slate-700/80 dark:border-b-teal-500/50 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Ocultar barra lateral" : "Mostrar barra lateral"}
          className="h-9 w-9 shrink-0 rounded-xl text-slate-500 transition-colors duration-200 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>
      <div>
        <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">
          Gestión de Laboratorio
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          Control de pacientes, órdenes y resultados
        </p>
      </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <GlobalSearch />
        <ThemeToggle />
        {session?.user && (
          <div className="flex items-center gap-2 border-l border-slate-200/80 pl-3 dark:border-slate-600/80">
            <span className="hidden text-sm text-slate-600 dark:text-slate-300 sm:inline">
              {session.user.name ?? session.user.email}
            </span>
            {session.user.roleCode === ADMIN_ROLE_CODE && (
              <Link
                href="/configuracion"
                title="Configuración"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              >
                <Settings className="h-4 w-4" />
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Cerrar sesión"
              className="h-9 w-9 rounded-xl text-slate-500 transition-colors duration-200 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

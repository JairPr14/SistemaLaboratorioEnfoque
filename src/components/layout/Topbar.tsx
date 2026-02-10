"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import { GlobalSearch } from "@/components/dashboard/GlobalSearch";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Topbar() {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Gestión de Laboratorio
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Control de pacientes, órdenes y resultados
        </p>
      </div>
      <div className="flex items-center gap-3">
        <GlobalSearch />
        <ThemeToggle />
        {session?.user && (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-600">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {session.user.name ?? session.user.email}
            </span>
            <Link
              href="/configuracion"
              title="Configuración"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Cerrar sesión"
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

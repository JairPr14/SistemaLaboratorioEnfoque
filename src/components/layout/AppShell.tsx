"use client";

import { useState, useEffect } from "react";
import { FlaskConical, ShieldCheck } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ShortcutsProvider } from "@/components/shortcuts/ShortcutsProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza apertura del sidebar al cambiar breakpoint
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <ShortcutsProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100/70 transition-colors duration-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden p-5 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="border-t border-slate-200/80 bg-white/70 px-5 py-3 backdrop-blur-md transition-colors dark:border-slate-700/80 dark:bg-slate-900/60 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <p className="inline-flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                Sistema de Laboratorio Clínico - Enfoque Salud
              </p>
              <p className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Desarrollado por <a href="https://novtiq.com" target="_blank" rel="noopener noreferrer" className="hover:underline">Novtiq.com</a>
              </p>
            </div>
          </footer>
        </div>
      </div>
    </ShortcutsProvider>
  );
}

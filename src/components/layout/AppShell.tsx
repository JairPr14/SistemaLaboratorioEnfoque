"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    else setSidebarOpen(true);
  }, [isMobile]);

  return (
    <div className="flex min-h-screen bg-slate-100/80 dark:bg-slate-950 transition-colors duration-200">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <main className="flex-1 p-5 sm:p-6 lg:p-8 min-w-0 overflow-x-auto dark:bg-slate-950/50 transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}

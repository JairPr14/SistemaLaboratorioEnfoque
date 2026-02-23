"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Bolt,
  ClipboardList,
  FileSearch,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Stethoscope,
} from "lucide-react";
import { GlobalSearch } from "@/components/dashboard/GlobalSearch";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  ADMIN_ROLE_CODE,
  hasPermission,
  PERMISSION_CAPTURAR_RESULTADOS,
  PERMISSION_QUICK_ACTIONS_ANALISTA,
  PERMISSION_QUICK_ACTIONS_ENTREGA,
  PERMISSION_QUICK_ACTIONS_RECEPCION,
} from "@/lib/auth";
import { QuickOrderModal } from "@/components/orders/QuickOrderModal";

export function Topbar({
  sidebarOpen,
  onToggleSidebar,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const canReception = hasPermission(session ?? null, PERMISSION_QUICK_ACTIONS_RECEPCION);
  const canAnalyst = hasPermission(session ?? null, PERMISSION_QUICK_ACTIONS_ANALISTA);
  const canDelivery = hasPermission(session ?? null, PERMISSION_QUICK_ACTIONS_ENTREGA);
  const canCapture = hasPermission(session ?? null, PERMISSION_CAPTURAR_RESULTADOS);

  const captureNext = async () => {
    if (!canCapture) return;
    setLoading(true);
    try {
      const res = await fetch("/api/queue/next?type=capture&today=1");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo obtener la siguiente orden");
        return;
      }
      if (!data.item?.orderId) {
        toast.info("No hay pendientes por capturar");
        return;
      }
      router.push(`/orders/${data.item.orderId}?captureItem=${data.item.itemId}`);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <header className="flex flex-wrap items-center justify-between gap-3 border border-slate-200/80 border-b-2 border-b-teal-500/70 bg-white/90 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-700/80 dark:border-b-teal-500/50 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm transition-colors duration-200">
      <div className="flex min-w-0 items-center gap-2">
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
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">
          Gestión de Laboratorio
        </h1>
        <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block sm:text-sm">
          Control de pacientes, órdenes y resultados
        </p>
      </div>
      </div>
      <div className="flex w-full flex-1 shrink-0 items-center justify-end gap-2 sm:w-auto sm:flex-initial sm:gap-3">
        {(canReception || canAnalyst || canDelivery) && (
          <div className="hidden lg:flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-600/80 px-2 py-1">
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Bolt className="h-3.5 w-3.5" />
              1 clic
            </span>
            {canReception && (
              <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => setQuickOrderOpen(true)}>
                <Stethoscope className="h-3.5 w-3.5" />
                Nueva orden
              </Button>
            )}
            {canAnalyst && canCapture && (
              <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => void captureNext()} disabled={loading}>
                <ClipboardList className="h-3.5 w-3.5" />
                Capturar siguiente
              </Button>
            )}
            {canDelivery && (
              <Link href="/orders?status=COMPLETADO&focusSearch=1">
                <Button size="sm" variant="ghost" className="h-8 gap-1.5">
                  <FileSearch className="h-3.5 w-3.5" />
                  Entrega
                </Button>
              </Link>
            )}
          </div>
        )}
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
    <QuickOrderModal open={quickOrderOpen} onOpenChange={setQuickOrderOpen} />
    </>
  );
}

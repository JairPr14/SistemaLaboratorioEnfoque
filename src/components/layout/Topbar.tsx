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
  Clock3,
  FileSearch,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { GlobalSearch } from "@/components/dashboard/GlobalSearch";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  ADMIN_ROLE_CODE,
  hasPermission,
  PERMISSION_CAPTURAR_RESULTADOS,
  PERMISSION_GESTIONAR_ADMISION,
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
  const canManageAdmission = hasPermission(session ?? null, PERMISSION_GESTIONAR_ADMISION);
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
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-md transition-colors duration-200 dark:border-slate-700/80 dark:bg-slate-900/80 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:gap-4">
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Ocultar barra lateral" : "Mostrar barra lateral"}
          className="h-9 w-9 shrink-0 rounded-xl border border-slate-200/70 text-slate-500 transition-all duration-200 hover:scale-[1.03] hover:border-teal-300 hover:text-teal-700 dark:border-slate-700/70 dark:text-slate-400 dark:hover:border-teal-700 dark:hover:text-teal-300"
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
        <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
          Control de pacientes, órdenes y resultados
        </p>
      </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3">
        {(canReception || canAnalyst || canDelivery || canManageAdmission) && (
          <div className="hidden shrink-0 lg:flex items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white to-slate-50 px-2 py-1.5 shadow-sm dark:border-slate-700/80 dark:from-slate-900 dark:to-slate-800">
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Bolt className="h-3.5 w-3.5" />
              1 clic
            </span>
            {canManageAdmission && (
              <Link href="/admisiones/nueva">
                <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-xl transition-all hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-900/30 dark:hover:text-teal-300">
                  <UserPlus className="h-3.5 w-3.5" />
                  Nueva admisión
                </Button>
              </Link>
            )}
            {canReception && (
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-xl transition-all hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-900/30 dark:hover:text-teal-300" onClick={() => setQuickOrderOpen(true)}>
                <Stethoscope className="h-3.5 w-3.5" />
                Nueva orden
              </Button>
            )}
            {canAnalyst && canCapture && (
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-xl transition-all hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-900/30 dark:hover:text-teal-300" onClick={() => void captureNext()} disabled={loading}>
                <ClipboardList className="h-3.5 w-3.5" />
                Capturar siguiente
              </Button>
            )}
            {canDelivery && (
              <Link href="/orders?status=COMPLETADO&focusSearch=1">
                <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-xl transition-all hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-900/30 dark:hover:text-teal-300">
                  <FileSearch className="h-3.5 w-3.5" />
                  Entrega
                </Button>
              </Link>
            )}
          </div>
        )}
        <div className="hidden min-w-0 shrink sm:block sm:w-auto sm:max-w-md md:flex-1">
          <GlobalSearch />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell session={session ?? null} />
          <ThemeToggle />
        {session?.user && (
          <div className="flex items-center gap-2 border-l border-slate-200/80 pl-3 dark:border-slate-600/80">
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700/70 dark:bg-slate-800 sm:flex">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-cyan-500 text-[11px] font-bold uppercase text-white">
                {(session.user.name ?? session.user.email ?? "U").slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="max-w-[160px] truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {session.user.name ?? session.user.email}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <Clock3 className="h-3 w-3" />
                  Sesión activa
                </p>
              </div>
            </div>
            {session.user.roleCode === ADMIN_ROLE_CODE && (
              <Link
                href="/configuracion"
                title="Configuración"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 text-slate-500 transition-all duration-200 hover:scale-[1.03] hover:border-teal-300 hover:text-teal-700 dark:border-slate-700/70 dark:text-slate-400 dark:hover:border-teal-700 dark:hover:text-teal-300"
              >
                <Settings className="h-4 w-4" />
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Cerrar sesión"
              className="h-9 w-9 rounded-xl border border-slate-200/70 text-slate-500 transition-all duration-200 hover:scale-[1.03] hover:border-rose-300 hover:text-rose-700 dark:border-slate-700/70 dark:text-slate-400 dark:hover:border-rose-800 dark:hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
        </div>
      </div>
    </div>
    </header>
    <QuickOrderModal open={quickOrderOpen} onOpenChange={setQuickOrderOpen} />
    </>
  );
}

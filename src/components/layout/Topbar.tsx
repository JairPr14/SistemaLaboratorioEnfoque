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
  Search,
  Settings,
  Stethoscope,
} from "lucide-react";
import { GlobalSearch } from "@/components/dashboard/GlobalSearch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  ADMIN_ROLE_CODE,
  hasPermission,
  PERMISSION_CAPTURAR_RESULTADOS,
  PERMISSION_QUICK_ACTIONS_ANALISTA,
  PERMISSION_QUICK_ACTIONS_ENTREGA,
  PERMISSION_QUICK_ACTIONS_RECEPCION,
} from "@/lib/auth-utils";
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
    <header className="sticky top-0 z-30 overflow-x-hidden border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/90">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        {/* Izquierda: toggle + título */}
        <div className="flex min-w-0 shrink-0 items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            title={sidebarOpen ? "Ocultar barra lateral" : "Mostrar barra lateral"}
            className="h-10 w-10 shrink-0 rounded-xl border border-slate-200/70 text-slate-500 transition-all duration-200 hover:border-teal-300 hover:text-teal-700 dark:border-slate-700/70 dark:text-slate-400 dark:hover:border-teal-700 dark:hover:text-teal-300"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
          <div className="min-w-0 border-l border-slate-200/60 pl-4 dark:border-slate-700/60">
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">
              Gestión de Laboratorio
            </h1>
            <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
              Control de pacientes, órdenes y resultados
            </p>
          </div>
        </div>

        {/* Centro: acciones rápidas */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2 lg:justify-end lg:gap-4">
          {(canReception || canAnalyst || canDelivery) && (
            <nav className="hidden shrink-0 lg:flex items-center gap-1 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-800/50" aria-label="Acciones rápidas">
              <span className="mr-2 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Bolt className="h-3.5 w-3.5" aria-hidden />
                1 clic
              </span>
              <div className="flex items-center gap-1">
                {canReception && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 min-w-[44px] gap-2 rounded-lg px-3 transition-all hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-900/30 dark:hover:text-teal-300"
                    onClick={() => setQuickOrderOpen(true)}
                  >
                    <Stethoscope className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="hidden xl:inline">Nueva orden</span>
                  </Button>
                )}
                {canAnalyst && canCapture && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 min-w-[44px] gap-2 rounded-lg px-3 transition-all hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-900/30 dark:hover:text-teal-300"
                    onClick={() => void captureNext()}
                    disabled={loading}
                  >
                    <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="hidden xl:inline">Capturar</span>
                  </Button>
                )}
                {canDelivery && (
                  <Link href="/orders?status=COMPLETADO&focusSearch=1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 min-w-[44px] gap-2 rounded-lg px-3 transition-all hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-900/30 dark:hover:text-teal-300"
                    >
                      <FileSearch className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="hidden xl:inline">Entrega</span>
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          )}
          {/* Búsqueda: icono en móvil (abre dialog), barra en desktop */}
          <div className="sm:hidden">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Buscar"
                  className="h-10 w-10 rounded-xl border border-slate-200/70 text-slate-500 hover:border-teal-300 hover:text-teal-700 dark:border-slate-700/70 dark:hover:border-teal-700 dark:hover:text-teal-300"
                >
                  <Search className="h-4 w-4" aria-hidden />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Buscar paciente u orden</DialogTitle>
                </DialogHeader>
                <div className="pt-2">
                  <GlobalSearch />
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="hidden min-w-0 shrink sm:block sm:w-64 md:w-80 lg:mx-4">
            <GlobalSearch />
          </div>
        </div>

        {/* Derecha: notificaciones, tema, usuario */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg">
              <NotificationBell session={session ?? null} />
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg">
              <ThemeToggle />
            </div>
          </div>
          {session?.user && (
            <div className="flex items-center gap-3 border-l border-slate-200/80 pl-4 dark:border-slate-700/80">
              <div className="hidden items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-800/50 sm:flex">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-cyan-500 text-xs font-bold uppercase text-white">
                  {(session.user.name ?? session.user.email ?? "U").slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="max-w-[140px] truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {session.user.name ?? session.user.email}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <Clock3 className="h-3 w-3 shrink-0" aria-hidden />
                    Sesión activa
                  </p>
                </div>
              </div>
              {session.user.roleCode === ADMIN_ROLE_CODE && (
                <Link
                  href="/configuracion"
                  title="Configuración"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 text-slate-500 transition-all duration-200 hover:border-teal-300 hover:text-teal-700 dark:border-slate-700/70 dark:text-slate-400 dark:hover:border-teal-700 dark:hover:text-teal-300"
                >
                  <Settings className="h-4 w-4" aria-hidden />
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Cerrar sesión"
                className="h-10 w-10 shrink-0 rounded-xl border border-slate-200/70 text-slate-500 transition-all duration-200 hover:border-rose-300 hover:text-rose-700 dark:border-slate-700/70 dark:text-slate-400 dark:hover:border-rose-800 dark:hover:text-rose-300"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
    <QuickOrderModal open={quickOrderOpen} onOpenChange={setQuickOrderOpen} />
    </>
  );
}

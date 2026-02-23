"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  hasAnyPermission,
  PERMISSION_VER_ORDENES,
  PERMISSION_QUICK_ACTIONS_RECEPCION,
  PERMISSION_QUICK_ACTIONS_ANALISTA,
  PERMISSION_QUICK_ACTIONS_ENTREGA,
  PERMISSION_CAPTURAR_RESULTADOS,
} from "@/lib/auth";
import type { Session } from "next-auth";

const LAB_PERMISSIONS = [
  PERMISSION_VER_ORDENES,
  PERMISSION_QUICK_ACTIONS_RECEPCION,
  PERMISSION_QUICK_ACTIONS_ANALISTA,
  PERMISSION_QUICK_ACTIONS_ENTREGA,
  PERMISSION_CAPTURAR_RESULTADOS,
];

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  linkTo: string | null;
  relatedOrderId: string | null;
  createdAt: string;
};

let audioContext: AudioContext | null = null;

function unlockAudio() {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
  if (audioContext) return;
  try {
    audioContext = new AudioContext();
    void audioContext.resume();
  } catch {
    // Ignorar
  }
}

function playNotificationSound() {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
  if (!audioContext) return;
  try {
    if (audioContext.state === "suspended") void audioContext.resume();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.2);
  } catch {
    // Ignorar
  }
}

export function NotificationBell({ session }: { session: Session | null }) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comandaItem, setComandaItem] = useState<NotificationItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetch = useRef(true);

  const canSeeLab = hasAnyPermission(session ?? null, LAB_PERMISSIONS);

  useEffect(() => {
    if (!session?.user || !canSeeLab) return;
    let mounted = true;
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json().catch(() => ({}));
        if (!mounted || !res.ok || !Array.isArray(data.items)) return;
        const newItems = data.items as NotificationItem[];
        const newIds = new Set(newItems.map((n) => n.id));
        const prevIds = lastIdsRef.current;
        const hasNew = newItems.some((n) => !prevIds.has(n.id));
        lastIdsRef.current = newIds;
        setItems(newItems);
        const latest = newItems[0];
        if (hasNew && latest) {
          setComandaItem(latest);
          if (!isFirstFetch.current) playNotificationSound();
        }
        isFirstFetch.current = false;
      } catch {
        if (mounted) setItems([]);
      }
    };
    void fetchNotifications();
    const interval = setInterval(fetchNotifications, 5_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void fetchNotifications();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session?.user, canSeeLab]);

  useEffect(() => {
    if (!session?.user || !canSeeLab) return;
    const unlock = () => unlockAudio();
    document.addEventListener("click", unlock, { once: true });
    return () => document.removeEventListener("click", unlock);
  }, [session?.user, canSeeLab]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  const markAsRead = async (id: string) => {
    setLoading(true);
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      setItems((prev) => prev.filter((n) => n.id !== id));
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    setOpen(false);
    setComandaItem(null);
    void markAsRead(n.id);
    if (n.linkTo) router.push(n.linkTo);
  };

  const dismissComanda = () => setComandaItem(null);

  if (!canSeeLab) return null;

  return (
    <>
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Notificaciones"
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 text-slate-500 transition-all duration-200",
          "hover:scale-[1.03] hover:border-teal-300 hover:text-teal-700",
          "dark:border-slate-700/70 dark:text-slate-400 dark:hover:border-teal-700 dark:hover:text-teal-300",
        )}
      >
        <Bell className="h-4 w-4" />
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white dark:bg-teal-500">
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          role="menu"
        >
          <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Alertas de Laboratorio
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {items.length === 0 ? "Sin notificaciones nuevas" : `${items.length} sin leer`}
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay notificaciones pendientes
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  disabled={loading}
                  className={cn(
                    "w-full border-b border-slate-100 px-3 py-2.5 text-left transition-colors last:border-0",
                    "hover:bg-teal-50 dark:border-slate-800 dark:hover:bg-teal-900/20",
                  )}
                  role="menuitem"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{n.title}</p>
                  {n.message && (
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {n.message}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>

    {/* Modal comanda cerca del navbar, se elimina solo al seleccionar o cerrar */}
    {comandaItem && (
      <div
        className={cn(
          "fixed top-16 left-4 z-[100] w-72 rounded-lg border-2 border-teal-500/80 bg-white shadow-xl transition-all duration-300 dark:border-teal-400/60 dark:bg-slate-900",
          "ring-2 ring-teal-500/20 dark:ring-teal-400/20",
        )}
        role="alert"
      >
        <div className="flex items-start justify-between gap-2 border-b border-teal-200/60 bg-teal-50/80 px-3 py-2 dark:border-teal-700/50 dark:bg-teal-900/30">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white dark:bg-teal-500">
              <Bell className="h-4 w-4" />
            </span>
            <p className="truncate text-sm font-bold text-teal-800 dark:text-teal-200">
              Nueva orden
            </p>
          </div>
          <button
            type="button"
            onClick={dismissComanda}
            className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => handleNotificationClick(comandaItem)}
          disabled={loading}
          className="w-full px-3 py-3 text-left transition-colors hover:bg-teal-50/50 dark:hover:bg-slate-800/50"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {comandaItem.title}
          </p>
          {comandaItem.message && (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {comandaItem.message}
            </p>
          )}
          <p className="mt-2 text-xs font-medium text-teal-600 dark:text-teal-400">
            Clic para ver →
          </p>
        </button>
      </div>
    )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { AutosaveStatus } from "@/hooks/useAutosaveResults";

type Props = {
  status: AutosaveStatus;
  savedAt: Date | null;
  onRetry?: () => void;
};

function formatTimeAgo(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 5) return "hace un momento";
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  return `hace ${min}m`;
}

export function AutosaveIndicator({ status, savedAt, onRetry }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (status !== "saved" || !savedAt) return;
    const t = setInterval(() => {
      setTick((v) => v + 1);
    }, 2000);
    return () => clearInterval(t);
  }, [status, savedAt]);

  void tick;
  const label =
    status === "saving"
      ? "Guardando…"
      : status === "saved" && savedAt
        ? `Guardado ${formatTimeAgo(savedAt)}`
        : status === "error"
          ? "Error"
          : "";

  if (!label) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      {status === "saving" && (
        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
      )}
      {status === "saved" && (
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
      )}
      {status === "error" && (
        <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
      )}
      <span>{label}</span>
      {status === "error" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-slate-700 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

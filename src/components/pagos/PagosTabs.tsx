"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, DollarSign, CheckCircle2 } from "lucide-react";

type TabValue = "pendientes" | "parcial" | "cobrados";

type Props = {
  tab: TabValue;
  counts: { pendientes: number; parcial: number; cobrados: number };
};

const tabConfig: Record<TabValue, { label: string; icon: typeof Clock; activeClass: string; badgeClass: string }> = {
  pendientes: {
    label: "Por cobrar",
    icon: Clock,
    activeClass: "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-500",
    badgeClass: "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200",
  },
  parcial: {
    label: "Pago parcial",
    icon: DollarSign,
    activeClass: "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-500",
    badgeClass: "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200",
  },
  cobrados: {
    label: "Cobrados",
    icon: CheckCircle2,
    activeClass: "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-500",
    badgeClass: "bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200",
  },
};

export function PagosTabs({ tab, counts }: Props) {
  const searchParams = useSearchParams();

  const buildHref = (t: TabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    return `/pagos?${params.toString()}`;
  };

  const tabClass = (t: TabValue) =>
    tab === t
      ? tabConfig[t].activeClass
      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50";

  const badgeClass = (t: TabValue) =>
    tab === t
      ? tabConfig[t].badgeClass
      : "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300";

  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <nav className="-mb-px flex gap-1" aria-label="Pestañas de pagos">
        {(Object.keys(tabConfig) as TabValue[]).map((t) => {
          const config = tabConfig[t];
          const Icon = config.icon;
          return (
            <Link
              key={t}
              href={buildHref(t)}
              className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium transition-all ${tabClass(t)}`}
            >
              <Icon className="h-4 w-4" />
              {config.label}
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(t)}`}>
                {counts[t]}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type TabValue = "pendientes" | "parcial" | "cobrados";

type Props = {
  tab: TabValue;
  counts: { pendientes: number; parcial: number; cobrados: number };
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
      ? "border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-500"
      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200";

  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <nav className="-mb-px flex gap-4" aria-label="Pestañas de pagos">
        <Link
          href={buildHref("pendientes")}
          className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${tabClass("pendientes")}`}
        >
          Por cobrar
          <span className="ml-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-600">
            {counts.pendientes}
          </span>
        </Link>
        <Link
          href={buildHref("parcial")}
          className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${tabClass("parcial")}`}
        >
          Pago parcial
          <span className="ml-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-600">
            {counts.parcial}
          </span>
        </Link>
        <Link
          href={buildHref("cobrados")}
          className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${tabClass("cobrados")}`}
        >
          Cobrados
          <span className="ml-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-600">
            {counts.cobrados}
          </span>
        </Link>
      </nav>
    </div>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Users, FileText, Percent } from "lucide-react";
import { StaffManagementClient } from "./StaffManagementClient";
import { PlanillaTab } from "./PlanillaTab";
import { DescuentosTab } from "./DescuentosTab";

type TabValue = "personal" | "planilla" | "descuentos";

const tabConfig: Record<TabValue, { label: string; icon: typeof Users }> = {
  personal: { label: "Personal", icon: Users },
  planilla: { label: "Planilla", icon: FileText },
  descuentos: { label: "Descuentos", icon: Percent },
};

export function GestionAdministrativaClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") ?? "personal";
  const tab: TabValue =
    tabParam === "planilla" || tabParam === "descuentos" ? tabParam : "personal";

  const buildHref = (t: TabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    return `/gestion-administrativa-clinica?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex gap-1" aria-label="Pestañas">
          {(Object.keys(tabConfig) as TabValue[]).map((t) => {
            const config = tabConfig[t];
            const Icon = config.icon;
            const active = tab === t;
            return (
              <Link
                key={t}
                href={buildHref(t)}
                className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-500"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {config.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {tab === "personal" && <StaffManagementClient />}
      {tab === "planilla" && <PlanillaTab />}
      {tab === "descuentos" && <DescuentosTab />}
    </div>
  );
}

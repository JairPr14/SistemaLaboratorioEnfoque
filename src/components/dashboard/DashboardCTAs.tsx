"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserPlus, ClipboardList, Plus, FileSearch, Building2 } from "lucide-react";
import { QuickOrderModal } from "@/components/orders/QuickOrderModal";
import { useState } from "react";

type Props = {
  hasAdmission: boolean;
  hasOrdersOrReception: boolean;
  hasPatients: boolean;
  canManageAdmission: boolean;
};

export function DashboardCTAs({
  hasAdmission,
  hasOrdersOrReception,
  hasPatients,
  canManageAdmission,
}: Props) {
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);

  const showAdmission = hasAdmission;
  const showLab = hasOrdersOrReception || hasPatients;

  if (!showAdmission && !showLab) return null;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-3">
          {showAdmission && (
            <>
              {canManageAdmission && (
                <Link href="/admission/nueva">
                  <Button size="sm" className="gap-2 rounded-xl shadow-sm transition-all hover:shadow">
                    <Plus className="h-4 w-4" />
                    Nueva atención
                  </Button>
                </Link>
              )}
              <Link href="/admission/pacientes-dia">
                <Button variant="outline" size="sm" className="gap-2 rounded-xl border-slate-200 dark:border-slate-600">
                  <ClipboardList className="h-4 w-4" />
                  Pacientes del día
                </Button>
              </Link>
              <Link href="/admission/resultados">
                <Button variant="outline" size="sm" className="gap-2 rounded-xl border-slate-200 dark:border-slate-600">
                  <FileSearch className="h-4 w-4" />
                  Resultados listos
                </Button>
              </Link>
              <Link href="/admission/pagos-externos">
                <Button variant="outline" size="sm" className="gap-2 rounded-xl border-slate-200 dark:border-slate-600">
                  <Building2 className="h-4 w-4" />
                  Pagos externos
                </Button>
              </Link>
            </>
          )}
          {showLab && (
            <>
              {hasOrdersOrReception && (
                <>
                  <Button size="sm" className="gap-2 rounded-xl shadow-sm transition-all hover:shadow" onClick={() => setQuickOrderOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Nueva orden
                  </Button>
                  <QuickOrderModal open={quickOrderOpen} onOpenChange={setQuickOrderOpen} />
                </>
              )}
              {hasPatients && (
                <Link href="/patients">
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl border-slate-200 dark:border-slate-600">
                    <UserPlus className="h-4 w-4" />
                    Pacientes
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

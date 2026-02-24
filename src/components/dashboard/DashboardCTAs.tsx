"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserPlus, ClipboardList, DollarSign, Plus } from "lucide-react";
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
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {showAdmission && (
            <>
              {canManageAdmission && (
                <Link href="/admisiones/nueva">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva orden
                  </Button>
                </Link>
              )}
              <Link href="/admisiones">
                <Button variant="outline" size="sm" className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Bandeja de admisión
                </Button>
              </Link>
              <Link href="/cobro-admision">
                <Button variant="outline" size="sm" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cobro admisión
                </Button>
              </Link>
            </>
          )}
          {showLab && (
            <>
              {hasOrdersOrReception && (
                <>
                  <Button size="sm" className="gap-2" onClick={() => setQuickOrderOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Nueva orden
                  </Button>
                  <QuickOrderModal open={quickOrderOpen} onOpenChange={setQuickOrderOpen} />
                </>
              )}
              {hasPatients && (
                <Link href="/patients">
                  <Button variant="outline" size="sm" className="gap-2">
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

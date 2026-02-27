"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterDateRange } from "@/components/common/FilterDateRange";
import { Calendar, RotateCcw, Filter, Building2, CreditCard, Activity } from "lucide-react";

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "ENTREGADO", label: "Entregados" },
  { value: "COMPLETADO", label: "Completados" },
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "PENDIENTE", label: "Pendientes" },
] as const;

const PAYMENT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE", label: "Por cobrar" },
  { value: "PARCIAL", label: "Pago parcial" },
  { value: "PAGADO", label: "Pagado" },
] as const;

type Branch = { id: string; code: string; name: string };

type Props = {
  defaultDateFrom: string;
  defaultDateTo: string;
  defaultStatus?: string;
  defaultPaymentStatus?: string;
  defaultBranchId?: string;
  /** Ruta base para navegación (ej. /reportes/finanzas, /reportes/estadisticas) */
  basePath?: string;
};

export function ReportesFilterForm({
  defaultDateFrom,
  defaultDateTo,
  defaultStatus = "",
  defaultPaymentStatus = "",
  defaultBranchId = "",
  basePath = "/reportes",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    fetch("/api/config/branches")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBranches(data);
      })
      .catch(() => {});
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const from = (form.elements.namedItem("dateFrom") as HTMLInputElement)?.value?.trim() ?? "";
    const to = (form.elements.namedItem("dateTo") as HTMLInputElement)?.value?.trim() ?? "";
    const status = (form.elements.namedItem("status") as HTMLSelectElement)?.value?.trim() ?? "";
    const paymentStatus = (form.elements.namedItem("paymentStatus") as HTMLSelectElement)?.value?.trim() ?? "";
    const branchId = (form.elements.namedItem("branchId") as HTMLSelectElement)?.value?.trim() ?? "";
    const params = new URLSearchParams();
    if (from) params.set("dateFrom", from);
    if (to) params.set("dateTo", to);
    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (branchId) params.set("branchId", branchId);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${basePath}?${query}` : basePath);
    });
  }

  const hasActiveFilters =
    searchParams.has("dateFrom") ||
    searchParams.has("dateTo") ||
    searchParams.has("status") ||
    searchParams.has("paymentStatus") ||
    searchParams.has("branchId");

  function resetFilters() {
    startTransition(() => {
      router.push(basePath);
    });
  }

  function setPreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    const params = new URLSearchParams();
    params.set("dateFrom", toYYYYMMDD(from));
    params.set("dateTo", toYYYYMMDD(to));
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const branchId = searchParams.get("branchId");
    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (branchId) params.set("branchId", branchId);
    startTransition(() => {
      router.push(`${basePath}?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Primera fila: Fechas */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        <FilterDateRange
          fromId="dateFrom"
          toId="dateTo"
          fromName="dateFrom"
          toName="dateTo"
          defaultFrom={defaultDateFrom}
          defaultTo={defaultDateTo}
          showLabelIcon={false}
          showInputIcon={true}
          fieldClassName=""
          labelClassName="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
          inputClassName="h-10 border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500/20 dark:border-slate-600"
        />
        
        <div>
          <label htmlFor="reportes-status" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Estado
          </label>
          <div className="relative">
            <Activity className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              id="reportes-status"
              name="status"
              defaultValue={defaultStatus}
              className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-10 pr-8 text-sm shadow-sm transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "_all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          <label htmlFor="reportes-payment-status" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Cobro
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              id="reportes-payment-status"
              name="paymentStatus"
              defaultValue={defaultPaymentStatus}
              className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-10 pr-8 text-sm shadow-sm transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {PAYMENT_OPTIONS.map((o) => (
                <option key={o.value || "_all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          <label htmlFor="reportes-branch" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Sede
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              id="reportes-branch"
              name="branchId"
              defaultValue={defaultBranchId}
              className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-10 pr-8 text-sm shadow-sm transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Todas las sedes</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Segunda fila: Acciones */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button type="submit" disabled={isPending} className="gap-2">
          <Filter className="h-4 w-4" />
          {isPending ? "Filtrando..." : "Aplicar filtros"}
        </Button>
        
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
        
        <span className="text-sm text-slate-500 dark:text-slate-400">Período rápido:</span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreset(7)}
            disabled={isPending}
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            7 días
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreset(30)}
            disabled={isPending}
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            30 días
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreset(90)}
            disabled={isPending}
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            90 días
          </Button>
        </div>
        
        {hasActiveFilters && (
          <>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              disabled={isPending}
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Limpiar filtros
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

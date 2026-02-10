"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export type OrdersFilterState = {
  status: string;
  dateRange: string;
  doctor: string;
  section: string;
};

type Props = {
  filters: OrdersFilterState;
  onChange: (f: OrdersFilterState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "COMPLETADO", label: "Completado" },
  { value: "ENTREGADO", label: "Entregado" },
  { value: "ANULADO", label: "Anulado" },
];

const dateRangeOptions = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "", label: "Todos" },
];

const sectionOptions = [
  { value: "", label: "Todas las secciones" },
  { value: "BIOQUIMICA", label: "Bioquímica" },
  { value: "HEMATOLOGIA", label: "Hematología" },
  { value: "INMUNOLOGIA", label: "Inmunología" },
  { value: "ORINA", label: "Orina" },
  { value: "HECES", label: "Heces" },
  { value: "OTROS", label: "Otros" },
];

export function OrdersFilters({ filters, onChange, onClear, hasActiveFilters }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        {statusOptions.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={filters.dateRange}
        onChange={(e) => onChange({ ...filters, dateRange: e.target.value })}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        {dateRangeOptions.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={filters.section}
        onChange={(e) => onChange({ ...filters, section: e.target.value })}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        {sectionOptions.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Input
        placeholder="Médico..."
        value={filters.doctor}
        onChange={(e) => onChange({ ...filters, doctor: e.target.value })}
        className="h-9 w-36 dark:border-slate-600 dark:bg-slate-800"
      />
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 text-slate-600 dark:text-slate-300">
          <X className="h-4 w-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "ENTREGADO", label: "Solo entregados" },
  { value: "COMPLETADO", label: "Completados" },
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "PENDIENTE", label: "Pendientes" },
] as const;

type Props = {
  defaultDateFrom: string;
  defaultDateTo: string;
  defaultStatus?: string;
};

export function ReportesFilterForm({ defaultDateFrom, defaultDateTo, defaultStatus = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const from = (form.elements.namedItem("dateFrom") as HTMLInputElement).value;
    const to = (form.elements.namedItem("dateTo") as HTMLInputElement).value;
    const status = (form.elements.namedItem("status") as HTMLSelectElement)?.value ?? "";
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("dateFrom", from);
    else params.delete("dateFrom");
    if (to) params.set("dateTo", to);
    else params.delete("dateTo");
    if (status) params.set("status", status);
    else params.delete("status");
    startTransition(() => {
      router.push(`/reportes?${params.toString()}`);
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
    if (status) params.set("status", status);
    startTransition(() => {
      router.push(`/reportes?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="reportes-status" className="text-sm text-slate-600">
            Estado
          </Label>
          <select
            id="reportes-status"
            name="status"
            defaultValue={defaultStatus}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm w-44"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "_all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="dateFrom" className="text-sm text-slate-600">
            Desde
          </Label>
          <Input
            id="dateFrom"
            name="dateFrom"
            type="date"
            defaultValue={defaultDateFrom}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="dateTo" className="text-sm text-slate-600">
            Hasta
          </Label>
          <Input
            id="dateTo"
            name="dateTo"
            type="date"
            defaultValue={defaultDateTo}
            className="w-40"
          />
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          <Calendar className="h-4 w-4 mr-1" />
          {isPending ? "Filtrando..." : "Filtrar"}
        </Button>
      </form>
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreset(7)}
          disabled={isPending}
        >
          7 días
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreset(30)}
          disabled={isPending}
        >
          30 días
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreset(90)}
          disabled={isPending}
        >
          90 días
        </Button>
      </div>
    </div>
  );
}

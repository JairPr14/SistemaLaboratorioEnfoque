"use client";

import { useEffect, useState } from "react";
import { BarChart3, Download, Users, FileText, Percent } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function monthName(m: number) {
  return MONTH_NAMES[m - 1] ?? String(m);
}

type StaffSummary = {
  total: number;
  activos: number;
  inactivos: number;
  mensuales: number;
  porTurnos: number;
};

type ReportData = {
  staffSummary: StaffSummary;
  staff: Array<{
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
    salary: number | null;
    paymentType: string;
    ratePerShift: number | null;
    isActive: boolean;
    hireDate: string | null;
  }>;
  periods: Array<{ id: string; year: number; month: number; quincena: number }>;
  payrolls: Array<{
    id: string;
    baseSalary: number;
    discountsTotal: number;
    netSalary: number;
    status: string;
    paymentMethod: string | null;
    paidAt: string | null;
    staffMember: { firstName: string; lastName: string; jobTitle: string | null; paymentType: string };
    payrollPeriod: { year: number; month: number; quincena: number };
  }>;
  payrollTotals: {
    totalBase: number;
    totalDiscounts: number;
    totalNet: number;
    totalPagado: number;
    totalPendiente: number;
  };
  discounts: Array<{
    id: string;
    amount: number;
    periodYear: number;
    periodMonth: number;
    periodQuincena: number;
    status: string;
    staffMember: { firstName: string; lastName: string };
    discountType: { code: string; name: string };
  }>;
  discountsTotal: number;
};

export function ReporteDetalladoTab() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<number | "">(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | "">("");

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterYear) params.set("year", String(filterYear));
      if (filterMonth) params.set("month", String(filterMonth));
      const res = await fetch(`/api/admin/report/detallado?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Error");
      setData(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [filterYear, filterMonth]);

  const exportCsv = () => {
    if (!data) return;
    const sep = ";";
    const rows: string[] = [];
    rows.push("REPORTE DETALLADO - GESTIÓN ADMINISTRATIVA");
    rows.push(`Período: ${filterYear || "Todos"} ${filterMonth ? monthName(filterMonth) : ""}`);
    rows.push("");
    rows.push("RESUMEN PERSONAL");
    rows.push(`Total${sep}${data.staffSummary.total}`);
    rows.push(`Activos${sep}${data.staffSummary.activos}`);
    rows.push(`Inactivos${sep}${data.staffSummary.inactivos}`);
    rows.push(`Pago mensual${sep}${data.staffSummary.mensuales}`);
    rows.push(`Pago por turnos${sep}${data.staffSummary.porTurnos}`);
    rows.push("");
    rows.push("PLANILLA");
    rows.push(`Período${sep}Personal${sep}Cargo${sep}Sueldo bruto${sep}Descuentos${sep}Neto${sep}Estado`);
    for (const p of data.payrolls) {
      const per = `${monthName(p.payrollPeriod.month)} ${p.payrollPeriod.year} Q${p.payrollPeriod.quincena}`;
      const name = `${p.staffMember.firstName} ${p.staffMember.lastName}`;
      rows.push(`${per}${sep}${name}${sep}${p.staffMember.jobTitle ?? ""}${sep}${p.baseSalary}${sep}${p.discountsTotal}${sep}${p.netSalary}${sep}${p.status}`);
    }
    rows.push("");
    rows.push(`Total pagado${sep}${data.payrollTotals.totalPagado}`);
    rows.push(`Total pendiente${sep}${data.payrollTotals.totalPendiente}`);
    rows.push("");
    rows.push("DESCUENTOS");
    rows.push(`Personal${sep}Tipo${sep}Período${sep}Monto${sep}Estado`);
    for (const d of data.discounts) {
      const per = `${monthName(d.periodMonth)} ${d.periodYear} Q${d.periodQuincena}`;
      rows.push(`${d.staffMember.firstName} ${d.staffMember.lastName}${sep}${d.discountType.name}${sep}${per}${sep}${d.amount}${sep}${d.status}`);
    }
    rows.push("");
    rows.push(`Total descuentos${sep}${data.discountsTotal}`);
    const csv = rows.join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-gestion-administrativa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reporte exportado");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          Cargando reporte...
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          No se pudo cargar el reporte.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reporte detallado
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value, 10) : "")}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="">Todos los años</option>
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value, 10) : "")}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="">Todos los meses</option>
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>{String(i + 1).padStart(2, "0")} – {name}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Personal activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.staffSummary.activos}</p>
            <p className="text-xs text-slate-500 mt-1">
              {data.staffSummary.mensuales} mensual · {data.staffSummary.porTurnos} por turnos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Planilla pagada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.payrollTotals.totalPagado)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {data.payrolls.filter((p) => p.status === "PAGADO").length} pagos registrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Planilla pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.payrollTotals.totalPendiente)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {data.payrolls.filter((p) => p.status === "PENDIENTE").length} pendientes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Total descuentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.discountsTotal)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {data.discounts.length} registros
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planilla por período</CardTitle>
          <p className="text-sm text-slate-500">
            Detalle de sueldos, descuentos y pagos por personal y quincena
          </p>
        </CardHeader>
        <CardContent>
          {data.payrolls.length === 0 ? (
            <p className="py-6 text-center text-slate-500">No hay datos de planilla para el filtro seleccionado.</p>
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Personal</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Descuentos</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payrolls.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {monthName(p.payrollPeriod.month)} {p.payrollPeriod.year} Q{p.payrollPeriod.quincena}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.staffMember.firstName} {p.staffMember.lastName}
                      </TableCell>
                      <TableCell>{p.staffMember.jobTitle ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.baseSalary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.discountsTotal)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(p.netSalary)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "PAGADO" ? "default" : "secondary"}>
                          {p.status === "PAGADO" ? "Pagado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.paidAt ? formatDate(p.paidAt) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descuentos aplicados</CardTitle>
          <p className="text-sm text-slate-500">
            Detalle de descuentos por personal y período
          </p>
        </CardHeader>
        <CardContent>
          {data.discounts.length === 0 ? (
            <p className="py-6 text-center text-slate-500">No hay descuentos para el filtro seleccionado.</p>
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personal</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.discounts.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {d.staffMember.firstName} {d.staffMember.lastName}
                      </TableCell>
                      <TableCell>{d.discountType.name}</TableCell>
                      <TableCell>
                        {monthName(d.periodMonth)} {d.periodYear} Q{d.periodQuincena}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(d.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "APLICADO" ? "default" : "secondary"}>
                          {d.status === "APLICADO" ? "Aplicado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

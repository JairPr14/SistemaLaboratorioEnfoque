"use client";

import { useEffect, useState } from "react";
import { Plus, DollarSign, Banknote, Smartphone, CreditCard, Eye, EyeOff, Percent, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";

type PayrollPeriod = { id: string; year: number; month: number; quincena: number };
type PayrollLine = {
  id: string | null;
  staffMemberId: string;
  baseSalary: number;
  discountsTotal: number;
  netSalary: number;
  status: string;
  paymentMethod: string | null;
  transferNumber: string | null;
  paidAt: string | null;
  paymentType?: string;
  ratePerShift?: number | null;
  shiftsCount?: number | null;
  staffMember: { fullName: string; jobTitle: string | null };
};
type PeriodDetail = PayrollPeriod & { payrolls: PayrollLine[] };

const PAYMENT_METHODS = [
  { value: "EFECTIVO", label: "Efectivo", icon: Banknote },
  { value: "TRANSFERENCIA", label: "Transferencia", icon: CreditCard },
  { value: "YAPE", label: "Yape", icon: Smartphone },
  { value: "PLIN", label: "Plin", icon: Smartphone },
] as const;

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

function monthName(m: number) {
  return MONTH_NAMES[m - 1] ?? String(m);
}

/** Agrupa períodos por mes/año: { "2026-2": [Q1, Q2] } */
function groupPeriodsByMonth(periods: PayrollPeriod[]) {
  const map = new Map<string, PayrollPeriod[]>();
  for (const p of periods) {
    const key = `${p.year}-${p.month}`;
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.quincena - b.quincena);
  }
  return map;
}

export function PlanillaTab() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [periodDetail, setPeriodDetail] = useState<PeriodDetail | null>(null);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);
  const [generatingFullMonth, setGeneratingFullMonth] = useState(false);
  const [submittingPeriod, setSubmittingPeriod] = useState(false);
  const [newPeriodYear, setNewPeriodYear] = useState(new Date().getFullYear());
  const [newPeriodMonth, setNewPeriodMonth] = useState(new Date().getMonth() + 1);
  const [newPeriodQuincena, setNewPeriodQuincena] = useState(1);
  const [payModal, setPayModal] = useState<PayrollLine | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("EFECTIVO");
  const [transferNumber, setTransferNumber] = useState("");
  const [paying, setPaying] = useState(false);
  const [hideSalary, setHideSalary] = useState(false);
  const [savingShifts, setSavingShifts] = useState<string | null>(null);
  const [discountLine, setDiscountLine] = useState<PayrollLine | null>(null);
  const [discountTypes, setDiscountTypes] = useState<Array<{ id: string; code: string; name: string; splitAcrossQuincenas: boolean }>>([]);
  const [discountForm, setDiscountForm] = useState({ discountTypeId: "", amount: "" });
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [editPayModal, setEditPayModal] = useState<PayrollLine | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>("EFECTIVO");
  const [editTransferNumber, setEditTransferNumber] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadPeriods = async () => {
    setLoadingPeriods(true);
    try {
      const res = await fetch("/api/admin/payroll/periods");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      setPeriods(data.items ?? []);
      if (!selectedPeriodId && (data.items?.length ?? 0) > 0) {
        setSelectedPeriodId(data.items[0].id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoadingPeriods(false);
    }
  };

  const loadDetail = async () => {
    if (!selectedPeriodId) return;
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/payroll/periods/${selectedPeriodId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      setPeriodDetail(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
      setPeriodDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) loadDetail();
    else setPeriodDetail(null);
  }, [selectedPeriodId]);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    const toCreate = generatingFullMonth
      ? [
          { year: newPeriodYear, month: newPeriodMonth, quincena: 1 },
          { year: newPeriodYear, month: newPeriodMonth, quincena: 2 },
        ]
      : [{ year: newPeriodYear, month: newPeriodMonth, quincena: newPeriodQuincena }];

    setSubmittingPeriod(true);
    let created = 0;
    let lastId: string | null = null;
    try {
      for (const p of toCreate) {
        const res = await fetch("/api/admin/payroll/periods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Error");
        created++;
        lastId = data.id ?? null;
      }
      toast.success(generatingFullMonth ? `Planilla de ${monthName(newPeriodMonth)} generada` : "Período creado");
      setShowPeriodDialog(false);
      setGeneratingFullMonth(false);
      await loadPeriods();
      if (lastId) setSelectedPeriodId(lastId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmittingPeriod(false);
      setGeneratingFullMonth(false);
    }
  };

  const handleShiftsChange = async (staffMemberId: string, shiftsCount: number) => {
    if (!selectedPeriodId) return;
    setSavingShifts(staffMemberId);
    try {
      const res = await fetch(`/api/admin/payroll/periods/${selectedPeriodId}/shifts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ staffMemberId, shiftsCount: Math.max(0, Math.floor(shiftsCount)) }],
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      await loadDetail();
    } catch {
      toast.error("Error al guardar turnos");
    } finally {
      setSavingShifts(null);
    }
  };

  const openPay = (line: PayrollLine) => {
    setPayModal(line);
    setPaymentMethod("EFECTIVO");
    setTransferNumber("");
  };

  const openEditPay = (line: PayrollLine) => {
    if (!line.id) return;
    setEditPayModal(line);
    setEditPaymentMethod(line.paymentMethod ?? "EFECTIVO");
    setEditTransferNumber(line.transferNumber ?? "");
  };

  const handleRestorePay = async (line: PayrollLine) => {
    if (!line.id) return;
    if (!confirm(`¿Restaurar el pago de ${line.staffMember.fullName} a pendiente? Los descuentos aplicados volverán a estar pendientes.`)) return;
    setRestoringId(line.id);
    try {
      const res = await fetch(`/api/admin/payroll/${line.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDIENTE" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast.success("Pago restaurado a pendiente");
      await loadDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setRestoringId(null);
    }
  };

  const handleSaveEditPay = async () => {
    if (!editPayModal?.id) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/payroll/${editPayModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: editPaymentMethod,
          transferNumber: editPaymentMethod === "TRANSFERENCIA" ? editTransferNumber : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast.success("Pago actualizado");
      setEditPayModal(null);
      await loadDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSavingEdit(false);
    }
  };

  const openDiscount = async (line: PayrollLine) => {
    setDiscountLine(line);
    setDiscountForm({ discountTypeId: "", amount: "" });
    try {
      const res = await fetch("/api/admin/catalog/discount-types");
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDiscountTypes(data.items ?? data ?? []);
    } catch {
      toast.error("Error al cargar tipos de descuento");
    }
  };

  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountLine || !periodDetail || !selectedPeriodId) return;
    const amount = parseFloat(discountForm.amount.replace(",", "."));
    if (!discountForm.discountTypeId || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Selecciona tipo de descuento e ingresa un monto válido");
      return;
    }
    setSavingDiscount(true);
    try {
      const res = await fetch("/api/admin/staff-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffMemberId: discountLine.staffMemberId,
          discountTypeId: discountForm.discountTypeId,
          amount,
          periodYear: periodDetail.year,
          periodMonth: periodDetail.month,
          periodQuincena: periodDetail.quincena,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast.success(data.created === 2 ? "Descuento aplicado en ambas quincenas (AFP/ONP)" : "Descuento registrado");
      setDiscountLine(null);
      await loadDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSavingDiscount(false);
    }
  };

  const handlePay = async () => {
    if (!payModal || !selectedPeriodId) return;
    setPaying(true);
    try {
      const res = await fetch("/api/admin/payroll/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId: selectedPeriodId,
          staffMemberId: payModal.staffMemberId,
          paymentMethod,
          transferNumber: paymentMethod === "TRANSFERENCIA" ? transferNumber : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast.success("Pago registrado");
      setPayModal(null);
      await loadDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setPaying(false);
    }
  };

  const grouped = groupPeriodsByMonth(periods);
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    const [yA, mA] = a.split("-").map(Number);
    const [yB, mB] = b.split("-").map(Number);
    return yB !== yA ? yB - yA : mB - mA;
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Planilla</CardTitle>
          <select
            value={selectedPeriodId ?? ""}
            onChange={(e) => setSelectedPeriodId(e.target.value || null)}
            className="min-w-[220px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="">Seleccionar período</option>
            {sortedKeys.map((key) => {
              const [year, month] = key.split("-").map(Number);
              const list = grouped.get(key) ?? [];
              return (
                <optgroup key={key} label={`${monthName(month)} ${year}`}>
                  {list.map((p) => (
                    <option key={p.id} value={p.id}>
                      Quincena{p.quincena.toString().padStart(2, "0")} (días {p.quincena === 1 ? "1-15" : "16-fin"})
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHideSalary((h) => !h)}
              className="gap-1"
              title={hideSalary ? "Mostrar sueldo" : "Ocultar sueldo"}
            >
              {hideSalary ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {hideSalary ? "Mostrar sueldo" : "Ocultar sueldo"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewPeriodYear(new Date().getFullYear());
                setNewPeriodMonth(new Date().getMonth() + 1);
                setNewPeriodQuincena(1);
                setGeneratingFullMonth(true);
                setShowPeriodDialog(true);
              }}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Generar planilla del mes
            </Button>
          </div>
      </CardHeader>
      <CardContent>
        {loadingPeriods ? (
          <p className="py-6 text-center text-sm text-slate-500">Cargando períodos...</p>
        ) : !selectedPeriodId ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Crea o selecciona un período para ver la planilla.
          </p>
        ) : loadingDetail ? (
          <p className="py-6 text-center text-sm text-slate-500">Cargando planilla...</p>
        ) : !periodDetail?.payrolls?.length ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No hay personal activo con sueldo en este período.
          </p>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personal</TableHead>
                  <TableHead>Cargo</TableHead>
                  {periodDetail.payrolls.some((l) => l.paymentType === "POR_TURNOS") && (
                    <TableHead className="text-center w-24">Turnos</TableHead>
                  )}
                  <TableHead className="text-right">Sueldo quincenal</TableHead>
                  <TableHead className="text-right">Descuentos</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Método</TableHead>
                    <TableHead className="min-w-[180px] text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodDetail.payrolls.map((line) => (
                  <TableRow key={line.staffMemberId}>
                    <TableCell className="font-medium">{line.staffMember.fullName}</TableCell>
                    <TableCell>{line.staffMember.jobTitle ?? "—"}</TableCell>
                    {periodDetail.payrolls.some((l) => l.paymentType === "POR_TURNOS") && (
                      <TableCell className="text-center">
                        {line.paymentType === "POR_TURNOS" ? (
                          <Input
                            key={`${line.staffMemberId}-${line.shiftsCount ?? 0}`}
                            type="number"
                            min={0}
                            step={1}
                            defaultValue={line.shiftsCount ?? 0}
                            onBlur={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!Number.isNaN(v) && v >= 0) {
                                handleShiftsChange(line.staffMemberId, v);
                              }
                            }}
                            disabled={line.status === "PAGADO" || savingShifts === line.staffMemberId}
                            className="h-8 w-16 text-center"
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {hideSalary ? "·····" : formatCurrency(line.baseSalary)}
                    </TableCell>
                    <TableCell className="text-right">
                      {hideSalary ? "·····" : formatCurrency(line.discountsTotal)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {hideSalary ? "·····" : formatCurrency(line.netSalary)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={line.status === "PAGADO" ? "default" : "secondary"}>
                        {line.status === "PAGADO" ? "Pagado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {line.status === "PAGADO" ? (
                        <span className="text-sm">
                          {line.paymentMethod === "TRANSFERENCIA" && line.transferNumber
                            ? `Transf. ${line.transferNumber}`
                            : line.paymentMethod ?? "—"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.status === "PENDIENTE" && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => openDiscount(line)}
                            title="Aplicar descuento"
                          >
                            <Percent className="h-4 w-4" />
                            Descuento
                          </Button>
                          <Button size="sm" className="gap-1" onClick={() => openPay(line)}>
                            <DollarSign className="h-4 w-4" />
                            Pagar
                          </Button>
                        </div>
                      )}
                      {line.status === "PAGADO" && line.id && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            onClick={() => openEditPay(line)}
                            title="Editar método de pago"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30"
                            onClick={() => handleRestorePay(line)}
                            disabled={restoringId === line.id}
                            title="Restaurar a pendiente"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Restaurar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog
        open={showPeriodDialog}
        onOpenChange={(o) => {
          setShowPeriodDialog(o);
          if (!o) setGeneratingFullMonth(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {generatingFullMonth ? "Generar planilla del mes" : "Nuevo período de planilla"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePeriod} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Año</Label>
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  value={newPeriodYear}
                  onChange={(e) => setNewPeriodYear(parseInt(e.target.value, 10) || 2025)}
                />
              </div>
              <div className="space-y-2">
                <Label>Mes</Label>
                <select
                  value={newPeriodMonth}
                  onChange={(e) => setNewPeriodMonth(parseInt(e.target.value, 10))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i + 1}>
                      {(i + 1).toString().padStart(2, "0")} – {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                onClick={() => setGeneratingFullMonth(!generatingFullMonth)}
              >
                {generatingFullMonth ? "Solo una quincena" : "Generar ambas quincenas del mes"}
              </button>
            </div>
            {!generatingFullMonth && (
              <div className="space-y-2">
                <Label>Quincena</Label>
                <select
                  value={newPeriodQuincena}
                  onChange={(e) => setNewPeriodQuincena(parseInt(e.target.value, 10))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value={1}>Quincena01 (días 1-15)</option>
                  <option value={2}>Quincena02 (días 16-fin)</option>
                </select>
              </div>
            )}
            {generatingFullMonth && (
              <p className="text-sm text-slate-500">
                Se crearán ambas quincenas del mes: Quincena01 y Quincena02.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPeriodDialog(false);
                  setGeneratingFullMonth(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingPeriod}>
                {submittingPeriod ? "Procesando..." : generatingFullMonth ? "Generar planilla" : "Crear período"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payModal} onOpenChange={(o) => !o && setPayModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
          </DialogHeader>
          {payModal && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {payModal.staffMember.fullName} – {formatCurrency(payModal.netSalary)}
              </p>
              <div className="space-y-2">
                <Label>Medio de pago</Label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <Button
                        key={m.value}
                        type="button"
                        variant={paymentMethod === m.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPaymentMethod(m.value)}
                        className="gap-1"
                      >
                        <Icon className="h-4 w-4" />
                        {m.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              {paymentMethod === "TRANSFERENCIA" && (
                <div className="space-y-2">
                  <Label htmlFor="transferNumber">N° operación</Label>
                  <Input
                    id="transferNumber"
                    value={transferNumber}
                    onChange={(e) => setTransferNumber(e.target.value)}
                    placeholder="Ej: 0123456789"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayModal(null)}>
                  Cancelar
                </Button>
                <Button onClick={handlePay} disabled={paying}>
                  {paying ? "Procesando..." : "Confirmar pago"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!discountLine} onOpenChange={(o) => !o && setDiscountLine(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descuento</DialogTitle>
            {discountLine && periodDetail && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {discountLine.staffMember.fullName} – {monthName(periodDetail.month)} {periodDetail.year} Q{periodDetail.quincena}
              </p>
            )}
          </DialogHeader>
          {discountLine && (
            <form onSubmit={handleDiscountSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de descuento *</Label>
                <select
                  value={discountForm.discountTypeId}
                  onChange={(e) => setDiscountForm((p) => ({ ...p, discountTypeId: e.target.value }))}
                  required
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="">Seleccionar</option>
                  {discountTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.splitAcrossQuincenas ? " (se divide en ambas quincenas)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Monto *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={discountForm.amount}
                  onChange={(e) => setDiscountForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="Ej: 150.50"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDiscountLine(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingDiscount}>
                  {savingDiscount ? "Guardando..." : "Aplicar descuento"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPayModal} onOpenChange={(o) => !o && setEditPayModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar pago</DialogTitle>
            {editPayModal && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {editPayModal.staffMember.fullName} – {formatCurrency(editPayModal.netSalary)}
              </p>
            )}
          </DialogHeader>
          {editPayModal && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Medio de pago</Label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <Button
                        key={m.value}
                        type="button"
                        variant={editPaymentMethod === m.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditPaymentMethod(m.value)}
                        className="gap-1"
                      >
                        <Icon className="h-4 w-4" />
                        {m.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              {editPaymentMethod === "TRANSFERENCIA" && (
                <div className="space-y-2">
                  <Label htmlFor="editTransferNumber">N° operación</Label>
                  <Input
                    id="editTransferNumber"
                    value={editTransferNumber}
                    onChange={(e) => setEditTransferNumber(e.target.value)}
                    placeholder="Ej: 0123456789"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditPayModal(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEditPay} disabled={savingEdit}>
                  {savingEdit ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, XCircle } from "lucide-react";
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
import { formatCurrency } from "@/lib/format";

type StaffMember = { id: string; firstName: string; lastName: string };
type DiscountType = { id: string; code: string; name: string; splitAcrossQuincenas: boolean };
type StaffDiscount = {
  id: string;
  amount: number;
  periodYear: number;
  periodMonth: number;
  periodQuincena: number;
  status: string;
  payrollId?: string | null;
  staffMember: { id: string; firstName: string; lastName: string };
  discountType: { id: string; code: string; name: string };
};

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function monthName(m: number) {
  return MONTH_NAMES[m - 1] ?? String(m);
}

export function DescuentosTab() {
  const [items, setItems] = useState<StaffDiscount[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [discountTypes, setDiscountTypes] = useState<DiscountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [form, setForm] = useState({
    staffMemberId: "",
    discountTypeId: "",
    amount: "",
    periodYear: new Date().getFullYear(),
    periodMonth: new Date().getMonth() + 1,
    periodQuincena: 1,
  });
  const [editItem, setEditItem] = useState<StaffDiscount | null>(null);
  const [editForm, setEditForm] = useState({ discountTypeId: "", amount: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, typesRes, discountsRes] = await Promise.all([
        fetch("/api/admin/staff"),
        fetch("/api/admin/catalog/discount-types"),
        fetch(
          `/api/admin/staff-discounts?${filterYear ? `year=${filterYear}` : ""}${filterMonth ? `&month=${filterMonth}` : ""}`
        ),
      ]);
      const staffData = await staffRes.json().catch(() => ({}));
      const typesData = await typesRes.json().catch(() => ({}));
      const discountsData = await discountsRes.json().catch(() => ({}));
      if (!staffRes.ok) throw new Error(staffData.error ?? "Error al cargar personal");
      if (!typesRes.ok) throw new Error(typesData.error ?? "Error al cargar tipos");
      if (!discountsRes.ok) throw new Error(discountsData.error ?? "Error al cargar descuentos");

      setStaff((staffData.items ?? []).filter((s: { isActive: boolean }) => s.isActive));
      setDiscountTypes(typesData?.items ?? typesData ?? []);
      setItems(discountsData.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterYear, filterMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!form.staffMemberId || !form.discountTypeId || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Completa los campos obligatorios y un monto válido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/staff-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffMemberId: form.staffMemberId,
          discountTypeId: form.discountTypeId,
          amount,
          periodYear: form.periodYear,
          periodMonth: form.periodMonth,
          periodQuincena: form.periodQuincena,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast.success(data.created === 2 ? "Descuento aplicado en ambas quincenas (AFP/ONP)" : "Descuento registrado");
      setShowAddDialog(false);
      setForm((p) => ({ ...p, staffMemberId: "", discountTypeId: "", amount: "" }));
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setForm({
      staffMemberId: "",
      discountTypeId: "",
      amount: "",
      periodYear: new Date().getFullYear(),
      periodMonth: new Date().getMonth() + 1,
      periodQuincena: 1,
    });
  };

  const openEdit = (item: StaffDiscount) => {
    if (item.payrollId) return;
    setEditItem(item);
    setEditForm({ discountTypeId: item.discountType.id, amount: String(item.amount) });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    const amount = parseFloat(editForm.amount.replace(",", "."));
    if (!editForm.discountTypeId || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Monto y tipo de descuento son obligatorios");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/staff-discounts/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountTypeId: editForm.discountTypeId, amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast.success("Descuento actualizado");
      setEditItem(null);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAnular = async (item: StaffDiscount) => {
    if (item.payrollId) {
      toast.error("No se puede anular un descuento ya aplicado a planilla");
      return;
    }
    if (!confirm(`¿Anular el descuento de ${item.staffMember.firstName} ${item.staffMember.lastName} (${item.discountType.name} - ${formatCurrency(item.amount)})?`)) return;
    setAnulandoId(item.id);
    try {
      const res = await fetch(`/api/admin/staff-discounts/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ANULADO" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast.success("Descuento anulado");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setAnulandoId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Descuentos</CardTitle>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value, 10) : "")}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="">Todos los años</option>
            {[2024, 2025, 2026].map((y) => (
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
        </div>
        <Button onClick={() => { openAdd(); setShowAddDialog(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo descuento
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No hay descuentos registrados.</p>
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
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={item.status === "ANULADO" ? "opacity-60" : undefined}>
                    <TableCell>
                      {item.staffMember.firstName} {item.staffMember.lastName}
                    </TableCell>
                    <TableCell>{item.discountType.name}</TableCell>
                    <TableCell>
                      {monthName(item.periodMonth)} {item.periodYear} Q{item.periodQuincena}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "APLICADO" ? "default" : item.status === "ANULADO" ? "danger" : "secondary"
                        }
                      >
                        {item.status === "APLICADO" ? "Aplicado" : item.status === "ANULADO" ? "Anulado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === "PENDIENTE" && !item.payrollId && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => openEdit(item)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400"
                            onClick={() => handleAnular(item)}
                            disabled={anulandoId === item.id}
                            title="Anular"
                          >
                            <XCircle className="h-4 w-4" />
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo descuento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Personal *</Label>
              <select
                value={form.staffMemberId}
                onChange={(e) => setForm((p) => ({ ...p, staffMemberId: e.target.value }))}
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              >
                <option value="">Seleccionar</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de descuento *</Label>
              <select
                value={form.discountTypeId}
                onChange={(e) => setForm((p) => ({ ...p, discountTypeId: e.target.value }))}
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
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="Ej: 150.50"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Año</Label>
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  value={form.periodYear}
                  onChange={(e) => setForm((p) => ({ ...p, periodYear: parseInt(e.target.value, 10) || 2025 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Mes</Label>
                <select
                  value={form.periodMonth}
                  onChange={(e) => setForm((p) => ({ ...p, periodMonth: parseInt(e.target.value, 10) || 1 }))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i + 1}>{String(i + 1).padStart(2, "0")} – {name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Quincena (AFP/ONP: se aplica en ambas)</Label>
                <select
                  value={form.periodQuincena}
                  onChange={(e) => setForm((p) => ({ ...p, periodQuincena: parseInt(e.target.value, 10) }))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value={1}>Q1 (1-15)</option>
                  <option value={2}>Q2 (16-fin)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar descuento</DialogTitle>
            {editItem && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {editItem.staffMember.firstName} {editItem.staffMember.lastName} – {monthName(editItem.periodMonth)} {editItem.periodYear} Q{editItem.periodQuincena}
              </p>
            )}
          </DialogHeader>
          {editItem && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de descuento *</Label>
                <select
                  value={editForm.discountTypeId}
                  onChange={(e) => setEditForm((p) => ({ ...p, discountTypeId: e.target.value }))}
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
                  value={editForm.amount}
                  onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="Ej: 150.50"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

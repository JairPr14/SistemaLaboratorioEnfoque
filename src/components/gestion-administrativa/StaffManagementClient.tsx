"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Clock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, formatTenure } from "@/lib/format";

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  jobTitle: string | null;
  phone: string | null;
  address: string | null;
  salary: number | null;
  hireDate: string | null;
  isActive: boolean;
};

type Form = {
  firstName: string;
  lastName: string;
  age: string;
  jobTitle: string;
  phone: string;
  address: string;
  salary: string;
  hireDate: string;
};

const emptyForm: Form = {
  firstName: "",
  lastName: "",
  age: "",
  jobTitle: "",
  phone: "",
  address: "",
  salary: "",
  hireDate: "",
};

export function StaffManagementClient() {
  const [items, setItems] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [hideSalary, setHideSalary] = useState(false);

  const loadItems = async () => {
    try {
      const res = await fetch("/api/admin/staff");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error al cargar");
      setItems(data.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setCreating(true);
  };

  const openEdit = (item: StaffMember) => {
    setEditing(item);
    setForm({
      firstName: item.firstName ?? "",
      lastName: item.lastName ?? "",
      age: item.age != null ? String(item.age) : "",
      jobTitle: item.jobTitle ?? "",
      phone: item.phone ?? "",
      address: item.address ?? "",
      salary: item.salary != null ? String(item.salary) : "",
      hireDate: item.hireDate ? item.hireDate.slice(0, 10) : "",
    });
  };

  const parseNum = (s: string): number | null => {
    const v = parseFloat(s.replace(",", "."));
    return Number.isFinite(v) ? v : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fn = form.firstName.trim();
    const ln = form.lastName.trim();
    if (!fn || !ln) {
      toast.error("Nombre y apellido son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        firstName: fn,
        lastName: ln,
        age: form.age ? parseNum(form.age) : null,
        jobTitle: form.jobTitle.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        salary: form.salary ? parseNum(form.salary) : null,
        hireDate: form.hireDate || null,
      };
      if (editing) {
        const res = await fetch(`/api/admin/staff/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Error");
        toast.success("Personal actualizado");
      } else {
        const res = await fetch("/api/admin/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Error");
        toast.success("Personal registrado");
      }
      setCreating(false);
      setEditing(null);
      await loadItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: StaffMember) => {
    if (!confirm(`¿Eliminar a ${item.firstName} ${item.lastName}?`)) return;
    try {
      const res = await fetch(`/api/admin/staff/${item.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast.success("Personal eliminado");
      await loadItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const activeItems = items.filter((i) => i.isActive);
  const inactiveItems = items.filter((i) => !i.isActive);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle>Personal ({activeItems.length})</CardTitle>
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
            <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
              Nuevo personal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-500">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No hay personal registrado.</p>
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Apellido</TableHead>
                    <TableHead className="text-center w-16">Edad</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead className="text-right">Sueldo</TableHead>
                    <TableHead>Fecha ingreso</TableHead>
                    <TableHead className="min-w-[140px]">Tiempo con nosotros</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-24 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.firstName}</TableCell>
                      <TableCell>{item.lastName}</TableCell>
                      <TableCell className="text-center">{item.age ?? "—"}</TableCell>
                      <TableCell>{item.jobTitle ?? "—"}</TableCell>
                      <TableCell>{item.phone ?? "—"}</TableCell>
                      <TableCell className="max-w-[180px] truncate" title={item.address ?? undefined}>
                        {item.address ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {hideSalary ? "·····" : (item.salary != null ? formatCurrency(item.salary) : "—")}
                      </TableCell>
                      <TableCell>{formatDate(item.hireDate)}</TableCell>
                      <TableCell className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {formatTenure(item.hireDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item)}
                            title="Eliminar"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {inactiveItems.length > 0 && (
                    <>
                      <TableRow className="bg-slate-50/50 dark:bg-slate-900/30">
                        <TableCell colSpan={11} className="text-sm text-slate-500 font-medium py-2">
                          Inactivos
                        </TableCell>
                      </TableRow>
                      {inactiveItems.map((item) => (
                        <TableRow key={item.id} className="opacity-60">
                          <TableCell>{item.firstName}</TableCell>
                          <TableCell>{item.lastName}</TableCell>
                          <TableCell className="text-center">{item.age ?? "—"}</TableCell>
                          <TableCell>{item.jobTitle ?? "—"}</TableCell>
                          <TableCell>{item.phone ?? "—"}</TableCell>
                          <TableCell>{item.address ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            {hideSalary ? "·····" : (item.salary != null ? formatCurrency(item.salary) : "—")}
                          </TableCell>
                          <TableCell>{formatDate(item.hireDate)}</TableCell>
                          <TableCell>{formatTenure(item.hireDate)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">Inactivo</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={creating || !!editing} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar personal" : "Nuevo personal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="Ej: Juan"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Ej: Pérez"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="age">Edad</Label>
                <Input
                  id="age"
                  type="number"
                  min={18}
                  max={100}
                  value={form.age}
                  onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
                  placeholder="Ej: 30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Cargo</Label>
                <Input
                  id="jobTitle"
                  value={form.jobTitle}
                  onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
                  placeholder="Ej: Técnico de laboratorio"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Ej: 987 654 321"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Ej: Av. Principal 123"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salary">Sueldo (S/.)</Label>
                <Input
                  id="salary"
                  type="text"
                  inputMode="decimal"
                  value={form.salary}
                  onChange={(e) => setForm((p) => ({ ...p, salary: e.target.value }))}
                  placeholder="S/. 0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hireDate">Fecha de ingreso</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => setForm((p) => ({ ...p, hireDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Template = {
  id: string;
  code: string;
  title: string;
  text: string;
  isActive: boolean;
};

type FormState = {
  code: string;
  title: string;
  text: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  code: "",
  title: "",
  text: "",
  isActive: true,
};

export default function PreAnaliticosPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Template | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/preanaliticos");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar");
      setItems(data.items ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setCreateOpen(true);
  };

  const openEdit = (item: Template) => {
    setForm({
      code: item.code,
      title: item.title,
      text: item.text,
      isActive: item.isActive,
    });
    setEditItem(item);
  };

  const saveCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/config/preanaliticos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear");
      toast.success("Plantilla creada");
      setCreateOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/config/preanaliticos/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar");
      toast.success("Plantilla actualizada");
      setEditItem(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item: Template) => {
    if (!confirm(`¿Eliminar plantilla "${item.title}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/config/preanaliticos/${item.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar");
      toast.success("Plantilla eliminada");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Comentarios preanalíticos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Catálogo reutilizable para observaciones preanalíticas.
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva plantilla
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plantillas ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-slate-500 dark:text-slate-400">Cargando...</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Texto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No hay plantillas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.code}</TableCell>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell className="max-w-[300px] truncate" title={item.text}>
                          {item.text}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.isActive ? "success" : "secondary"}>
                            {item.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void removeItem(item)}
                              disabled={saving}
                              className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva plantilla preanalítica</DialogTitle>
          </DialogHeader>
          <FormFields form={form} onChange={setForm} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => void saveCreate()} disabled={saving}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar plantilla preanalítica</DialogTitle>
          </DialogHeader>
          <FormFields form={form} onChange={setForm} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={() => void saveEdit()} disabled={saving}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (next: FormState) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="preCode">Código</Label>
        <Input
          id="preCode"
          value={form.code}
          onChange={(e) => onChange({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "_") })}
          placeholder="HEMOLISIS"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="preTitle">Título</Label>
        <Input
          id="preTitle"
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          placeholder="Muestra hemolizada"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="preText">Texto</Label>
        <textarea
          id="preText"
          value={form.text}
          onChange={(e) => onChange({ ...form, text: e.target.value })}
          rows={4}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          placeholder="La muestra presenta hemólisis moderada..."
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => onChange({ ...form, isActive: e.target.checked })}
        />
        Activa
      </label>
    </div>
  );
}

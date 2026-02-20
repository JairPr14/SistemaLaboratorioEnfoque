"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Section = {
  id: string;
  code: string;
  name: string;
  order: number;
  isActive: boolean;
  _count?: { labTests: number };
};

export default function SeccionesPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ code: "", name: "", order: 0 });

  const loadSections = async () => {
    try {
      const res = await fetch("/api/sections");
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections ?? []);
      }
    } catch {
      toast.error("Error al cargar secciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const handleOpenEdit = (section: Section) => {
    setEditingSection(section);
    setFormData({
      code: section.code,
      name: section.name,
      order: section.order,
    });
  };

  const handleOpenCreate = () => {
    setCreating(true);
    setFormData({ code: "", name: "", order: sections.length });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sections/${editingSection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      toast.success("Sección actualizada");
      setEditingSection(null);
      await loadSections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error("Código y nombre son requeridos");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al crear");
      toast.success("Sección creada");
      setCreating(false);
      setFormData({ code: "", name: "", order: 0 });
      await loadSections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (section: Section) => {
    if (!confirm(`¿Eliminar la sección "${section.name}"? Debe tener 0 análisis asignados.`)) return;
    try {
      const res = await fetch(`/api/sections/${section.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      toast.success("Sección eliminada");
      await loadSections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-slate-500 dark:text-slate-400">
        Cargando secciones...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Gestión de Secciones
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Crear, editar y eliminar secciones de laboratorio. Los análisis se agrupan por sección.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nueva sección
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Secciones ({sections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="-mx-1 overflow-x-auto">
            <Table className="min-w-[400px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-center">Orden</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Análisis</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                      No hay secciones. Crea la primera.
                    </TableCell>
                  </TableRow>
                ) : (
                  sections.map((s, idx) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-slate-500">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{s.code}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-center">{s.order}</TableCell>
                      <TableCell>
                        <Badge variant={s.isActive ? "success" : "secondary"}>
                          {s.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{s._count?.labTests ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(s)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(s)}
                            title="Eliminar"
                            disabled={(s._count?.labTests ?? 0) > 0}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
        </CardContent>
      </Card>

      {/* Diálogo editar */}
      <Dialog open={!!editingSection} onOpenChange={(o) => !o && setEditingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar sección</DialogTitle>
          </DialogHeader>
          {editingSection && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editCode">Código (mayúsculas)</Label>
                <Input
                  id="editCode"
                  value={formData.code}
                  onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="BIOQUIMICA"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editName">Nombre</Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Bioquímica"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOrder">Orden</Label>
                <Input
                  id="editOrder"
                  type="number"
                  min={0}
                  value={formData.order}
                  onChange={(e) => setFormData((p) => ({ ...p, order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingSection(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo crear */}
      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva sección</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newCode">Código (mayúsculas, sin espacios)</Label>
              <Input
                id="newCode"
                value={formData.code}
                onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, "_") }))}
                placeholder="MICROBIOLOGIA"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newName">Nombre</Label>
              <Input
                id="newName"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Microbiología"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newOrder">Orden</Label>
              <Input
                id="newOrder"
                type="number"
                min={0}
                value={formData.order}
                onChange={(e) => setFormData((p) => ({ ...p, order: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creando..." : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

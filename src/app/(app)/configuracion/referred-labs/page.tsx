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

type ReferredLab = {
  id: string;
  name: string;
  logoUrl: string | null;
  stampImageUrl: string | null;
  isActive: boolean;
  _count?: { labTests: number };
};

export default function ReferredLabsPage() {
  const [labs, setLabs] = useState<ReferredLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLab, setEditingLab] = useState<ReferredLab | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<{ id: string; type: string } | null>(null);
  const [formData, setFormData] = useState({ name: "", isActive: true });

  const loadLabs = async () => {
    try {
      const res = await fetch("/api/referred-labs");
      if (res.ok) {
        const data = await res.json();
        setLabs(data.items ?? []);
      }
    } catch {
      toast.error("Error al cargar laboratorios referidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabs();
  }, []);

  const handleOpenEdit = (lab: ReferredLab) => {
    setEditingLab(lab);
    setFormData({ name: lab.name, isActive: lab.isActive });
  };

  const handleOpenCreate = () => {
    setCreating(true);
    setFormData({ name: "", isActive: true });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLab) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/referred-labs/${editingLab.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      toast.success("Laboratorio actualizado");
      setEditingLab(null);
      await loadLabs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/referred-labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al crear");
      toast.success("Laboratorio referido creado");
      setCreating(false);
      setFormData({ name: "", isActive: true });
      await loadLabs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lab: ReferredLab) => {
    if (!confirm(`¿Eliminar el laboratorio referido "${lab.name}"? No debe tener análisis asignados.`)) return;
    try {
      const res = await fetch(`/api/referred-labs/${lab.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      toast.success("Laboratorio eliminado");
      await loadLabs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const handleUpload = async (labId: string, type: "logo" | "stamp", file: File) => {
    setUploading({ id: labId, type });
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch(`/api/referred-labs/${labId}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al subir");
      toast.success(data.message || "Imagen subida");
      await loadLabs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir");
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-slate-500 dark:text-slate-400">
        Cargando laboratorios referidos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Laboratorios referidos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Instituciones a las que derivamos análisis. Configura logo y sello para mostrar en los PDFs.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nuevo laboratorio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Laboratorios ({labs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="-mx-1 overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Sello</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Análisis</TableHead>
                  <TableHead className="w-32 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                      No hay laboratorios referidos. Crea el primero.
                    </TableCell>
                  </TableRow>
                ) : (
                  labs.map((lab) => (
                    <TableRow key={lab.id}>
                      <TableCell className="font-medium">{lab.name}</TableCell>
                      <TableCell>
                        {lab.logoUrl ? (
                          <img
                            src={lab.logoUrl}
                            alt={`Logo ${lab.name}`}
                            className="h-10 w-auto max-w-20 object-contain"
                          />
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          id={`logo-${lab.id}`}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(lab.id, "logo", f);
                            e.target.value = "";
                          }}
                        />
                        <Label htmlFor={`logo-${lab.id}`} className="cursor-pointer ml-2">
                          <span className="text-xs text-teal-600 hover:underline">
                            {uploading?.id === lab.id && uploading?.type === "logo"
                              ? "Subiendo…"
                              : lab.logoUrl
                                ? "Cambiar"
                                : "Subir"}
                          </span>
                        </Label>
                      </TableCell>
                      <TableCell>
                        {lab.stampImageUrl ? (
                          <img
                            src={lab.stampImageUrl}
                            alt={`Sello ${lab.name}`}
                            className="h-10 w-auto max-w-20 object-contain"
                          />
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          id={`stamp-${lab.id}`}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(lab.id, "stamp", f);
                            e.target.value = "";
                          }}
                        />
                        <Label htmlFor={`stamp-${lab.id}`} className="cursor-pointer ml-2">
                          <span className="text-xs text-teal-600 hover:underline">
                            {uploading?.id === lab.id && uploading?.type === "stamp"
                              ? "Subiendo…"
                              : lab.stampImageUrl
                                ? "Cambiar"
                                : "Subir"}
                          </span>
                        </Label>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lab.isActive ? "success" : "secondary"}>
                          {lab.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{lab._count?.labTests ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(lab)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(lab)}
                            title="Eliminar"
                            disabled={(lab._count?.labTests ?? 0) > 0}
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

      <Dialog open={!!editingLab} onOpenChange={(o) => !o && setEditingLab(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar laboratorio referido</DialogTitle>
          </DialogHeader>
          {editingLab && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Nombre</Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Laboratorio X"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                <Label htmlFor="editActive">Activo</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingLab(null)}>
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

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo laboratorio referido</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newName">Nombre</Label>
              <Input
                id="newName"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Laboratorio referido"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="newActive"
                checked={formData.isActive}
                onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <Label htmlFor="newActive">Activo</Label>
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

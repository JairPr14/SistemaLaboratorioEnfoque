"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageLayoutClasses } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type TestOption = { id: string; code: string; name: string; section: string; price: number };
type ProfileTest = { id: string; code: string; name: string; section: string; price: number };
type Profile = {
  id: string;
  name: string;
  packagePrice: number | null;
  tests: ProfileTest[];
};

export default function PromocionesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tests, setTests] = useState<TestOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPackagePrice, setFormPackagePrice] = useState<string>("");
  const [formTestIds, setFormTestIds] = useState<string[]>([]);
  const [searchTest, setSearchTest] = useState("");

  const loadData = async () => {
    const [profRes, testsRes] = await Promise.all([
      fetch("/api/test-profiles?active=false"),
      fetch("/api/tests?active=true"),
    ]);
    if (profRes.ok) {
      const data = await profRes.json();
      setProfiles(data.profiles ?? []);
    }
    if (testsRes.ok) {
      const data = await testsRes.json();
      const items = (data.items ?? []).map(
        (t: { id: string; code: string; name: string; section?: { name?: string; code?: string } | null; price: number }) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          section: t.section?.name ?? t.section?.code ?? "",
          price: t.price,
        }),
      );
      setTests(items);
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormPackagePrice("");
    setFormTestIds([]);
    setOpen(true);
  };

  const openEdit = (p: Profile) => {
    setEditing(p);
    setFormName(p.name);
    setFormPackagePrice(p.packagePrice != null ? String(p.packagePrice) : "");
    setFormTestIds(p.tests.map((t) => t.id));
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Nombre requerido");
      return;
    }
    if (formTestIds.length === 0) {
      toast.error("Selecciona al menos un análisis");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        packagePrice: formPackagePrice === "" ? null : Number(formPackagePrice),
        labTestIds: formTestIds,
      };
      const url = editing ? `/api/test-profiles/${editing.id}` : "/api/test-profiles";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al guardar");
      }
      toast.success(editing ? "Promoción actualizada" : "Promoción creada");
      setOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta promoción?")) return;
    const res = await fetch(`/api/test-profiles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo eliminar");
      return;
    }
    toast.success("Promoción eliminada");
    await loadData();
  };

  const toggleTest = (testId: string) => {
    setFormTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };

  const filteredTests = searchTest.trim()
    ? tests.filter(
        (t) =>
          t.code.toLowerCase().includes(searchTest.toLowerCase()) ||
          t.name.toLowerCase().includes(searchTest.toLowerCase())
      )
    : tests;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
        Cargando promociones...
      </div>
    );
  }

  return (
    <div className={pageLayoutClasses.wrapper}>
      <div className={pageLayoutClasses.headerRow}>
        <div>
          <h1 className={pageLayoutClasses.title}>Promociones / Paquetes</h1>
          <p className={pageLayoutClasses.description}>
            Agrupa análisis con un precio promocional (ej. Perfil renal, Paquete recién nacido).
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva promoción
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5">
            Al crear una orden puedes elegir una promoción y se aplicará el precio del paquete (si lo definiste).
          </p>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 py-6 text-center">
              No hay promociones. Crea una para ofrecer paquetes como Glucosa+Urea+Creatinina o Paquete recién nacido.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Análisis</TableHead>
                  <TableHead className="text-right">Precio paquete</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">{p.name}</TableCell>
                    <TableCell>
                      <span className="text-slate-600 dark:text-slate-300">
                        {p.tests.map((t) => t.code).join(", ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.packagePrice != null ? (
                        <span className="font-medium text-slate-900 dark:text-slate-100">S/ {Number(p.packagePrice).toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">Suma de análisis</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar promoción" : "Nueva promoción"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="promo-name">Nombre</Label>
              <Input
                id="promo-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej. Perfil renal, Paquete recién nacido"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-price">Precio del paquete (opcional)</Label>
              <Input
                id="promo-price"
                type="number"
                min="0"
                step="0.01"
                value={formPackagePrice}
                onChange={(e) => setFormPackagePrice(e.target.value)}
                placeholder="Dejar vacío = suma de los análisis"
              />
            </div>
            <div className="space-y-2">
              <Label>Análisis incluidos</Label>
              {/* Apartado: análisis seleccionados */}
              {formTestIds.length > 0 ? (
                <div className="rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-3 mb-2">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Análisis seleccionados ({formTestIds.length})
                  </p>
                  <ul className="max-h-32 overflow-auto space-y-1">
                    {formTestIds.map((id) => {
                      const t = tests.find((x) => x.id === id);
                      if (!t) return null;
                      return (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-2 text-sm rounded px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                          <span className="text-slate-800 dark:text-slate-200">
                            {t.code} – {t.name}
                            <span className="text-slate-500 dark:text-slate-400 ml-1">
                              (S/ {Number(t.price).toFixed(2)})
                            </span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                            onClick={() => toggleTest(t.id)}
                            aria-label={`Quitar ${t.code}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Ningún análisis seleccionado. Elige al menos uno en la lista de abajo.
                </p>
              )}
              <Input
                placeholder="Buscar por código o nombre..."
                value={searchTest}
                onChange={(e) => setSearchTest(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-48 overflow-auto rounded border border-slate-200 dark:border-slate-600 p-2 space-y-1">
                {filteredTests.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <input
                      type="checkbox"
                      checked={formTestIds.includes(t.id)}
                      onChange={() => toggleTest(t.id)}
                    />
                    <span className="text-sm text-slate-900 dark:text-slate-200">
                      {t.code} - {t.name} (S/ {Number(t.price).toFixed(2)})
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : editing ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

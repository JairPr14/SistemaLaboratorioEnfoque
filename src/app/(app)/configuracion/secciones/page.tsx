"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, FlaskConical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { sectionValues } from "@/features/lab/schemas";

type LabTest = {
  id: string;
  code: string;
  name: string;
  section: string;
  price: number;
  isActive: boolean;
};

const sectionLabels: Record<string, string> = {
  BIOQUIMICA: "Bioquímica",
  HEMATOLOGIA: "Hematología",
  INMUNOLOGIA: "Inmunología",
  ORINA: "Orina",
  HECES: "Heces",
  OTROS: "Otros",
};

export default function SeccionesPage() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEdit, setTestEdit] = useState<LabTest | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTests = async () => {
    const res = await fetch("/api/tests");
    if (res.ok) {
      const data = await res.json();
      setTests(data.items ?? []);
    }
  };

  useEffect(() => {
    loadTests().finally(() => setLoading(false));
  }, []);

  const handleSaveSection = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!testEdit) return;
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const newSection = (form.elements.namedItem("testSection") as HTMLSelectElement).value;
    try {
      const res = await fetch(`/api/tests/${testEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: testEdit.code,
          name: testEdit.name,
          section: newSection,
          price: testEdit.price,
          isActive: testEdit.isActive,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Sección actualizada");
      setTestEdit(null);
      await loadTests();
    } catch {
      toast.error("No se pudo actualizar la sección");
    } finally {
      setSaving(false);
    }
  };

  // Agrupar por sección
  const groupedBySection = tests.reduce((acc, test) => {
    const section = test.section;
    if (!acc[section]) acc[section] = [];
    acc[section].push(test);
    return acc;
  }, {} as Record<string, LabTest[]>);

  const sortedSections = Object.keys(groupedBySection).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
        Cargando análisis...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Gestión de Secciones
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Modifica la sección asignada a cada análisis
        </p>
      </div>

      {sortedSections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
            <p>No hay análisis registrados.</p>
            <p className="text-sm mt-2">
              Ve a <Link href="/catalog/tests" className="text-slate-900 dark:text-slate-100 underline">Catálogo</Link> para agregar análisis.
            </p>
          </CardContent>
        </Card>
      ) : (
        sortedSections.map((section) => (
          <Card key={section}>
            <CardHeader className="flex flex-row items-center gap-2">
              <FlaskConical className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <CardTitle className="text-base">
                {sectionLabels[section] ?? section}
              </CardTitle>
              <Badge variant="secondary" className="ml-auto">
                {groupedBySection[section].length} análisis
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedBySection[section].map((test, idx) => (
                      <TableRow key={test.id}>
                        <TableCell className="text-slate-500 dark:text-slate-400">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-900 dark:text-slate-100">{test.code}</TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">{test.name}</TableCell>
                        <TableCell className="text-right text-slate-900 dark:text-slate-200">
                          S/ {Number(test.price).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={test.isActive ? "success" : "secondary"}>
                            {test.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTestEdit(test)}
                            title="Cambiar sección"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Diálogo editar sección */}
      <Dialog open={!!testEdit} onOpenChange={(open) => !open && setTestEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar sección del análisis</DialogTitle>
          </DialogHeader>
          {testEdit && (
            <form onSubmit={handleSaveSection} className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Código:</span> {testEdit.code}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Nombre:</span> {testEdit.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  <span className="font-medium">Sección actual:</span>{" "}
                  {sectionLabels[testEdit.section] ?? testEdit.section}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="testSection">Nueva sección</Label>
                <select
                  id="testSection"
                  name="testSection"
                  defaultValue={testEdit.section}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  {sectionValues.map((s) => (
                    <option key={s} value={s}>
                      {sectionLabels[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setTestEdit(null)}>
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
    </div>
  );
}

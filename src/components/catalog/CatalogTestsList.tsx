"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/common/DeleteButton";
import { formatCurrency } from "@/lib/format";

type Test = {
  id: string;
  code: string;
  name: string;
  section: string;
  sectionName?: string;
  sectionId?: string;
  price: number;
  /** Indica si el análisis tiene una plantilla asociada */
  hasTemplate: boolean;
  /** Indica si la plantilla está marcada como verificada/correcta */
  isTemplateVerified: boolean;
  /** ID de la plantilla (para abrirla en /templates/[id]) */
  templateId: string | null;
};

type Props = {
  tests: Test[];
  /** Si el usuario puede editar análisis (GESTIONAR_CATALOGO o EDITAR_PRECIO_CATALOGO) */
  canEdit?: boolean;
  /** Si el usuario puede eliminar análisis (GESTIONAR_CATALOGO) */
  canDelete?: boolean;
};

export function CatalogTestsList({ tests, canEdit = false, canDelete = false }: Props) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"none" | "priceAsc" | "priceDesc">("none");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = tests;
    if (term) {
      result = tests.filter(
      (t) =>
        t.code.toLowerCase().includes(term) ||
        t.name.toLowerCase().includes(term) ||
        t.section.toLowerCase().includes(term),
      );
    }

    if (sortMode === "priceAsc") {
      return [...result].sort((a, b) => a.price - b.price);
    }
    if (sortMode === "priceDesc") {
      return [...result].sort((a, b) => b.price - a.price);
    }
    return result;
  }, [tests, search, sortMode]);

  return (
    <div className="space-y-6 min-w-0">
      {/* Catálogo de análisis */}
      <section className="min-w-0">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Catálogo de análisis
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline">Ordenar por precio:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as "none" | "priceAsc" | "priceDesc")}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="none">Sin ordenar</option>
              <option value="priceAsc">Precio: menor a mayor</option>
              <option value="priceDesc">Precio: mayor a menor</option>
            </select>
          </div>
        </div>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Plantilla</TableHead>
                    <TableHead>Sección</TableHead>
                    <TableHead>Precio</TableHead>
                    {(canEdit || canDelete) && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit || canDelete ? 6 : 5} className="text-center text-slate-500 dark:text-slate-400 py-8">
                        {search.trim()
                          ? "Ningún análisis coincide con la búsqueda."
                          : "No hay análisis en el catálogo."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell className="font-mono text-sm text-slate-900 dark:text-slate-100">{test.code}</TableCell>
                        <TableCell>
                          {canEdit ? (
                            <Link
                              className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                              href={`/catalog/tests/${test.id}`}
                            >
                              {test.name}
                            </Link>
                          ) : (
                            <span className="font-medium text-slate-900 dark:text-slate-100">{test.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {test.hasTemplate ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                                <FileText className="h-3.5 w-3.5 text-sky-500" />
                                <span>Plantilla</span>
                                {test.isTemplateVerified && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                )}
                              </span>
                              {test.templateId && (
                                <Link
                                  href={`/templates/${test.templateId}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-teal-500 hover:text-teal-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-teal-400 dark:hover:text-teal-300"
                                >
                                  <span>Ver plantilla</span>
                                </Link>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              Sin plantilla
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600 dark:text-slate-300">{test.sectionName ?? test.section}</span>
                        </TableCell>
                        <TableCell className="text-slate-900 dark:text-slate-200">{formatCurrency(test.price)}</TableCell>
                        {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          {canEdit && (
                            <Link
                              href={`/catalog/tests/${test.id}`}
                              className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:underline mr-2"
                            >
                              Editar
                            </Link>
                          )}
                          {canDelete && (
                              test.hasTemplate ? (
                                <DeleteButton url={`/api/tests/${test.id}`} label="Eliminar" />
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled
                                  title="No se puede eliminar un análisis sin plantilla. Cree primero una plantilla."
                                >
                                  Eliminar
                                </Button>
                              )
                            )}
                        </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Buscar análisis */}
      <section>
        <label htmlFor="catalog-search" className="sr-only">
          Buscar análisis
        </label>
        <input
          id="catalog-search"
          type="text"
          placeholder="Buscar análisis"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full min-w-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:focus:border-teal-400 dark:focus:ring-teal-400"
        />
      </section>
    </div>
  );
}

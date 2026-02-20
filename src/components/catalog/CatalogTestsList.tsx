"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
};

type Props = {
  tests: Test[];
};

export function CatalogTestsList({ tests }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tests;
    return tests.filter(
      (t) =>
        t.code.toLowerCase().includes(term) ||
        t.name.toLowerCase().includes(term) ||
        t.section.toLowerCase().includes(term),
    );
  }, [tests, search]);

  return (
    <div className="space-y-6 min-w-0">
      {/* Catálogo de análisis */}
      <section className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Catálogo de análisis
        </h2>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Sección</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 dark:text-slate-400 py-8">
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
                          <Link
                            className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                            href={`/catalog/tests/${test.id}`}
                          >
                            {test.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600 dark:text-slate-300">{test.sectionName ?? test.section}</span>
                        </TableCell>
                        <TableCell className="text-slate-900 dark:text-slate-200">{formatCurrency(test.price)}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/catalog/tests/${test.id}`}
                            className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:underline mr-2"
                          >
                            Editar
                          </Link>
                          <DeleteButton url={`/api/tests/${test.id}`} label="Eliminar" />
                        </TableCell>
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

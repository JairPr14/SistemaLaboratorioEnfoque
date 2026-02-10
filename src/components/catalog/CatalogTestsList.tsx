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
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
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
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        {search.trim()
                          ? "Ningún análisis coincide con la búsqueda."
                          : "No hay análisis en el catálogo."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell className="font-mono text-sm">{test.code}</TableCell>
                        <TableCell>
                          <Link
                            className="font-medium text-slate-900 hover:underline"
                            href={`/catalog/tests/${test.id}`}
                          >
                            {test.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">{test.section}</span>
                        </TableCell>
                        <TableCell>{formatCurrency(test.price)}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/catalog/tests/${test.id}`}
                            className="text-sm text-slate-600 hover:text-slate-900 hover:underline mr-2"
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
          className="w-full min-w-0 rounded-lg border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
      </section>
    </div>
  );
}

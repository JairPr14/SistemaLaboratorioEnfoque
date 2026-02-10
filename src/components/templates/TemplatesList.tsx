"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { DeleteButton } from "@/components/common/DeleteButton";

type TemplateItem = {
  id: string;
  title: string;
  testCode: string;
  testName: string;
  itemsCount: number;
};

type Props = {
  templates: TemplateItem[];
};

export function TemplatesList({ templates }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(term) ||
        t.testCode.toLowerCase().includes(term) ||
        t.testName.toLowerCase().includes(term),
    );
  }, [templates, search]);

  return (
    <div className="space-y-6 min-w-0">
      {/* Catálogo de plantillas */}
      <section className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Catálogo de plantillas
        </h2>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm">
                  {search.trim()
                    ? "Ninguna plantilla coincide con la búsqueda."
                    : "Aún no hay plantillas."}
                </p>
                {!search.trim() && (
                  <p className="text-xs text-slate-400 mt-1">
                    Crea una con el formulario de abajo.
                  </p>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {filtered.map((template) => (
                  <li key={template.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 hover:bg-slate-50/50">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/templates/${template.id}`}
                          className="font-medium text-slate-900 block hover:underline truncate"
                        >
                          {template.title}
                        </Link>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {template.testCode} · {template.testName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          {template.itemsCount} parámetros
                        </span>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/templates/${template.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 h-9 px-3 text-sm font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          >
                            Editar
                          </Link>
                          <DeleteButton
                            url={`/api/templates/${template.id}`}
                            label="Eliminar"
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Buscar plantilla */}
      <section>
        <label htmlFor="templates-search" className="sr-only">
          Buscar plantilla
        </label>
        <input
          id="templates-search"
          type="text"
          placeholder="Buscar plantilla"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full min-w-0 rounded-lg border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
      </section>
    </div>
  );
}

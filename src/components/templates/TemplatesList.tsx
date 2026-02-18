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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Catálogo de plantillas
        </h2>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                <p className="text-sm">
                  {search.trim()
                    ? "Ninguna plantilla coincide con la búsqueda."
                    : "Aún no hay plantillas."}
                </p>
                {!search.trim() && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Crea una con el formulario de abajo.
                  </p>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
                {filtered.map((template) => (
                  <li key={template.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/templates/${template.id}`}
                          className="font-medium text-slate-900 dark:text-slate-100 block hover:underline truncate"
                        >
                          {template.title}
                        </Link>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          {template.testCode} · {template.testName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
                        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {template.itemsCount} parámetros
                        </span>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/templates/${template.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 dark:border-slate-600 h-9 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
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
          className="w-full min-w-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:focus:border-teal-400 dark:focus:ring-teal-400"
        />
      </section>
    </div>
  );
}

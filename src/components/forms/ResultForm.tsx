"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { resultSchema } from "@/features/lab/schemas";
import { useAutosaveResults } from "@/hooks/useAutosaveResults";
import { AutosaveIndicator } from "./AutosaveIndicator";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ResultFormValues = z.infer<typeof resultSchema>;

type RefRange = {
  id?: string;
  ageGroup: string | null;
  sex: "M" | "F" | "O" | null;
  refRangeText: string | null;
  refMin: number | null;
  refMax: number | null;
  order: number;
};

type TemplateItem = {
  id: string;
  groupName: string | null;
  paramName: string;
  unit: string | null;
  refRangeText: string | null;
  refMin: number | null;
  refMax: number | null;
  valueType: string;
  selectOptions: string[];
  order: number;
  refRanges?: RefRange[];
};

export type ResultFormHandle = { saveDraft: () => Promise<void> };

type Props = {
  orderId: string;
  itemId: string;
  templateItems: TemplateItem[];
  defaultValues?: ResultFormValues;
  onSaved?: () => void;
  resultFormRef?: React.MutableRefObject<ResultFormHandle | null>;
};

const AGE_GROUP_LABELS: Record<string, string> = {
  NIÑOS: "Niños",
  JOVENES: "Jóvenes",
  ADULTOS: "Adultos",
};
const SEX_LABELS: Record<string, string> = { M: "Hombres", F: "Mujeres", O: "Otros" };

function formatRefRange(range: RefRange): string {
  const criteria = [
    range.ageGroup ? AGE_GROUP_LABELS[range.ageGroup] || range.ageGroup : null,
    range.sex ? SEX_LABELS[range.sex] || range.sex : null,
  ].filter(Boolean);
  const rangeDisplay =
    range.refRangeText ||
    (range.refMin !== null && range.refMax !== null ? `${range.refMin} - ${range.refMax}` : "");
  if (!rangeDisplay) return "";
  return criteria.length > 0 ? `${criteria.join(" + ")}: ${rangeDisplay}` : rangeDisplay;
}

export function ResultForm({
  orderId,
  itemId,
  templateItems,
  defaultValues,
  onSaved,
  resultFormRef,
}: Props) {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const form = useForm<ResultFormValues>({
    resolver: zodResolver(resultSchema) as Resolver<ResultFormValues>,
    defaultValues: defaultValues ?? {
      reportedBy: "",
      comment: "",
      items:
        templateItems.length > 0
          ? templateItems.map((item) => ({
              templateItemId: item.id,
              paramNameSnapshot: item.paramName,
              unitSnapshot: item.unit,
              refTextSnapshot: item.refRangeText,
              refMinSnapshot: item.refMin ?? undefined,
              refMaxSnapshot: item.refMax ?? undefined,
              value: "",
              isOutOfRange: false,
              isHighlighted: false,
              order: item.order,
            }))
          : [],
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: "items" });

  const { status, savedAt, saveOnBlur, retry } = useAutosaveResults({
    orderId,
    itemId,
    form,
    debounceMs: 800,
    enabled: fields.length > 0,
  });

  useEffect(() => {
    if (resultFormRef) {
      resultFormRef.current = { saveDraft: saveOnBlur };
      return () => {
        resultFormRef.current = null;
      };
    }
  }, [resultFormRef, saveOnBlur]);

  // No hacer router.refresh() al guardar: evita que los campos se actualicen/parpadeen mientras el usuario escribe

  useEffect(() => {
    if (session?.user && !defaultValues?.reportedBy) {
      const value = session.user.name ?? session.user.email ?? "";
      if (value) form.setValue("reportedBy", value);
    }
  }, [session?.user, defaultValues?.reportedBy, form]);

  const itemsToUse: Array<TemplateItem & { index: number }> =
    templateItems.length > 0
      ? (() => {
          const seen = new Set<string>();
          const list: Array<TemplateItem & { index: number }> = [];
          templateItems.forEach((item, idx) => {
            const key = `${(item.paramName || "").trim()}|${(item.unit ?? "").trim()}`;
            if (seen.has(key)) return;
            seen.add(key);
            list.push({ ...item, index: idx });
          });
          return list;
        })()
      : [];

  const groupedItems = itemsToUse.reduce(
    (acc, item) => {
      const g = item.groupName || "General";
      if (!acc[g]) acc[g] = [];
      acc[g].push(item);
      return acc;
    },
    {} as Record<string, Array<TemplateItem & { index: number }>>
  );

  const flatIndices = itemsToUse.map((i) => i.index);

  const handleSave = async () => {
    const values = form.getValues();
    const items = values.items ?? [];
    if (items.length === 0) {
      toast.error("No hay parámetros para guardar");
      return;
    }
    const validatedItems = items.map((item, idx) => {
      const t = templateItems[idx];
      return {
        ...item,
        paramNameSnapshot: item.paramNameSnapshot || t?.paramName || "",
        unitSnapshot: item.unitSnapshot ?? t?.unit ?? null,
        refTextSnapshot: item.refTextSnapshot ?? t?.refRangeText ?? null,
        refMinSnapshot: item.refMinSnapshot ?? t?.refMin ?? null,
        refMaxSnapshot: item.refMaxSnapshot ?? t?.refMax ?? null,
      };
    });
    const payload = {
      reportedBy: values.reportedBy ?? "",
      comment: values.comment ?? "",
      items: validatedItems,
    };
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const firstIssue = data.details?.issues?.[0] ?? data.details?.errors?.[0];
        const path = firstIssue?.path;
        const msg = firstIssue?.message ?? data.error ?? "No se pudo guardar";
        if (
          path &&
          Array.isArray(path) &&
          path[0] === "items" &&
          path[2] === "value"
        ) {
          const paramIdx = path[1];
          const paramName =
            validatedItems[paramIdx]?.paramNameSnapshot ||
            `Parámetro ${(paramIdx as number) + 1}`;
          toast.error(`Completa el resultado de "${paramName}" antes de guardar`);
        } else {
          toast.error(typeof msg === "string" ? msg : "No se pudo guardar");
        }
        return;
      }
      toast.success("Resultados guardados");
      onSaved?.();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIdx: number) => {
      const isTab = e.key === "Tab";
      const isEnter = e.key === "Enter";
      if (!isTab && !isEnter) return;
      const idx = flatIndices.indexOf(currentIdx);
      if (idx < 0) return;
      e.preventDefault();
      const nextIdx = e.shiftKey ? idx - 1 : idx + 1;
      const nextFormIdx = flatIndices[nextIdx];
      if (nextFormIdx !== undefined) {
        const ref = inputRefs.current[nextIdx];
        ref?.focus();
      }
    },
    [flatIndices]
  );

  return (
    <form onBlur={() => saveOnBlur()} className="space-y-4">
      <div className="flex items-center justify-between min-h-6">
        <AutosaveIndicator status={status} savedAt={savedAt} onRetry={retry} />
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Usa <kbd className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px]">Tab</kbd> o{" "}
        <kbd className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px]">Enter</kbd> para
        desplazarte entre parámetros. Guardado automático.
      </p>

      <div className="rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="relative z-10 p-4 space-y-4">
          {Object.entries(groupedItems).map(([groupName, items]) => (
            <div key={groupName} className="space-y-2">
              {items.length > 1 && (
                <div className="bg-slate-700 px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-white dark:bg-slate-600 rounded-t">
                  {groupName}
                </div>
              )}
              <Table className={items.length <= 1 ? "" : "rounded-b"}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28%] text-[11px] font-semibold uppercase">Análisis</TableHead>
                    <TableHead className="w-[32%] text-[11px] font-semibold uppercase">Resultado</TableHead>
                    <TableHead className="w-[40%] text-[11px] font-semibold uppercase">
                      Valor referencial
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const formIndex = item.index;
                    const globalIdx = flatIndices.indexOf(formIndex);
                    const value = form.watch(`items.${formIndex}.value`) ?? "";
                    const isHighlighted = form.watch(`items.${formIndex}.isHighlighted`) ?? false;

                    const mainRef =
                      form.watch(`items.${formIndex}.refTextSnapshot`) ||
                      item.refRangeText ||
                      (item.refMin != null && item.refMax != null
                        ? `${item.refMin} - ${item.refMax}`
                        : "");
                    const refRanges = item.refRanges ?? [];
                    const additionalRefs = refRanges.map(formatRefRange).filter(Boolean);
                    // Para parámetros tipo SELECT sin rango definido: mostrar opciones válidas como valor referencial
                    const selectOptions = item.selectOptions ?? [];
                    const optionsAsRef =
                      selectOptions.length > 0 && !mainRef && additionalRefs.length === 0
                        ? selectOptions.join(" / ")
                        : "";

                    return (
                      <TableRow key={`${item.id}-${formIndex}`}>
                        <TableCell className="py-2 text-sm text-slate-800 dark:text-slate-200">
                          {form.watch(`items.${formIndex}.paramNameSnapshot`) || item.paramName}
                          {item.unit && (
                            <span className="text-slate-500 dark:text-slate-400 ml-1 text-xs">
                              ({item.unit})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex gap-1.5 items-center">
                            <Input
                              type="text"
                              value={value}
                              onChange={(e) => form.setValue(`items.${formIndex}.value`, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, formIndex)}
                              ref={(el) => {
                                inputRefs.current[globalIdx] = el;
                              }}
                              placeholder="-"
                              className={`h-9 flex-1 min-w-0 text-sm ${
                                isHighlighted ? "font-bold" : ""
                              } border-slate-300 dark:border-slate-600 dark:bg-slate-800`}
                            />
                            <button
                              type="button"
                              aria-label={isHighlighted ? "Quitar negrita" : "Resaltar en negrita"}
                              title={isHighlighted ? "Quitar negrita" : "Negrita"}
                              onClick={() =>
                                form.setValue(`items.${formIndex}.isHighlighted`, !isHighlighted)
                              }
                              className={`shrink-0 h-9 w-9 rounded border text-xs font-bold transition-colors ${
                                isHighlighted
                                  ? "bg-slate-800 text-white border-slate-800 dark:bg-teal-600"
                                  : "border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800"
                              }`}
                            >
                              B
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs text-slate-700 dark:text-slate-300">
                          <div className="space-y-1">
                            {mainRef && <div>{mainRef}</div>}
                            {additionalRefs.length > 0 && (
                              <div className="space-y-0.5 text-slate-600 dark:text-slate-400">
                                {additionalRefs.map((r, i) => (
                                  <div key={i}>{r}</div>
                                ))}
                              </div>
                            )}
                            {optionsAsRef && (
                              <div className="text-slate-600 dark:text-slate-400">{optionsAsRef}</div>
                            )}
                            {!mainRef && additionalRefs.length === 0 && !optionsAsRef && (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button type="button" onClick={handleSave} disabled={saving} className="min-w-[140px]">
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

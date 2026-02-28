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
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

function generateExtraId(): string {
  return `extra-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type Props = {
  orderId: string;
  itemId: string;
  templateItems: TemplateItem[];
  defaultValues?: ResultFormValues;
  onSaved?: () => void;
  onParamAdded?: () => void;
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
  onParamAdded,
  resultFormRef,
}: Props) {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [addingParam, setAddingParam] = useState(false);
  const [removingParamId, setRemovingParamId] = useState<string | null>(null);
  const [paramToRemove, setParamToRemove] = useState<(TemplateItem & { index: number }) | null>(null);
  const [addParamModalOpen, setAddParamModalOpen] = useState(false);
  const [addParamGroup, setAddParamGroup] = useState("");
  const [addParamName, setAddParamName] = useState("Nuevo parámetro");
  const [editParamModalOpen, setEditParamModalOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<(TemplateItem & { index: number }) | null>(null);
  const [editParamGroup, setEditParamGroup] = useState("");
  const [editParamName, setEditParamName] = useState("");
  const [updatingParamId, setUpdatingParamId] = useState<string | null>(null);
  const [additionalItems, setAdditionalItems] = useState<TemplateItem[]>([]);
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

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

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

  // Cuando templateItems se actualiza (tras refresh) e incluye nuestros adicionales, quitarlos de la lista local
  useEffect(() => {
    const templateIds = new Set(templateItems.map((t) => t.id));
    setAdditionalItems((prev) =>
      prev.filter((a) => !templateIds.has(a.id))
    );
  }, [templateItems]);

  // Plantilla + parámetros adicionales del paciente (solo en templateSnapshot, no en plantilla de análisis)
  const allTemplateItems = [
    ...templateItems.map((item, idx) => ({ ...item, index: idx })),
    ...additionalItems.map((item, idx) => ({
      ...item,
      index: templateItems.length + idx,
    })),
  ];
  const itemsToUse: Array<TemplateItem & { index: number }> = allTemplateItems;

  const groupedItems = itemsToUse.reduce(
    (acc, item) => {
      const g = item.groupName?.trim() || "General";
      if (!acc[g]) acc[g] = [];
      acc[g].push(item);
      return acc;
    },
    {} as Record<string, Array<TemplateItem & { index: number }>>
  );

  // Ordenar grupos por el orden de la plantilla (primer ítem de cada grupo)
  const groupNames = Object.keys(groupedItems).sort((a, b) => {
    const minOrderA = Math.min(...(groupedItems[a] ?? []).map((i) => i.order));
    const minOrderB = Math.min(...(groupedItems[b] ?? []).map((i) => i.order));
    return minOrderA - minOrderB;
  });

  // Ordenar ítems dentro de cada grupo por orden de plantilla
  const groupedItemsSorted = groupNames.reduce(
    (acc, g) => {
      acc[g] = [...(groupedItems[g] ?? [])].sort((a, b) => a.order - b.order);
      return acc;
    },
    {} as Record<string, Array<TemplateItem & { index: number }>>
  );

  const flatIndices = itemsToUse.map((i) => i.index);
  const allTemplateItemsForSave = [...templateItems, ...additionalItems];

  const handleAddParam = async () => {
    const paramName = addParamName.trim() || "Nuevo parámetro";
    const groupName = addParamGroup.trim() || null;
    setAddParamModalOpen(false);
    setAddParamName("Nuevo parámetro");
    setAddParamGroup("");

    const maxOrder = Math.max(
      0,
      ...templateItems.map((i) => i.order),
      ...additionalItems.map((i) => i.order)
    );
    const newId = generateExtraId();
    const newItem: TemplateItem = {
      id: newId,
      groupName,
      paramName,
      unit: null,
      refRangeText: null,
      refMin: null,
      refMax: null,
      valueType: "TEXT",
      selectOptions: [],
      order: maxOrder + 1,
      refRanges: [],
    };
    setAdditionalItems((prev) => [...prev, newItem]);
    append({
      templateItemId: newId,
      paramNameSnapshot: paramName,
      unitSnapshot: undefined,
      refTextSnapshot: undefined,
      refMinSnapshot: undefined,
      refMaxSnapshot: undefined,
      value: "",
      isOutOfRange: false,
      isHighlighted: false,
      order: newItem.order,
    });
    setAddingParam(true);
    try {
      const snapshotItems = [...templateItems, ...additionalItems, newItem].map((t) => ({
        id: t.id,
        groupName: t.groupName ?? null,
        paramName: t.paramName,
        unit: t.unit ?? null,
        refRangeText: t.refRangeText ?? null,
        refMin: t.refMin ?? null,
        refMax: t.refMax ?? null,
        valueType: t.valueType,
        selectOptions: Array.isArray(t.selectOptions) ? t.selectOptions : [],
        order: t.order,
        refRanges: t.refRanges ?? [],
      }));
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}/template-snapshot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: snapshotItems }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Error al añadir parámetro");
        setAdditionalItems((prev) => prev.filter((i) => i.id !== newId));
        const currentItems = form.getValues("items") ?? [];
        form.setValue("items", currentItems.slice(0, -1));
      } else {
        toast.success("Parámetro añadido (solo para este paciente)");
        onParamAdded?.();
      }
    } catch {
      toast.error("Error de conexión");
      setAdditionalItems((prev) => prev.filter((i) => i.id !== newId));
      const currentItems = form.getValues("items") ?? [];
      form.setValue("items", currentItems.slice(0, -1));
    } finally {
      setAddingParam(false);
    }
  };

  const handleConfirmRemove = () => {
    if (paramToRemove) {
      handleRemoveParam(paramToRemove);
      setParamToRemove(null);
    }
  };

  const handleRemoveParam = async (item: TemplateItem & { index: number }) => {
    const remaining = allTemplateItemsForSave.filter((t) => t.id !== item.id);
    if (remaining.length === 0) {
      toast.error("Debe haber al menos un parámetro");
      return;
    }
    setRemovingParamId(item.id);
    try {
      const snapshotItems = remaining.map((t) => ({
        id: t.id,
        groupName: t.groupName ?? null,
        paramName: t.paramName,
        unit: t.unit ?? null,
        refRangeText: t.refRangeText ?? null,
        refMin: t.refMin ?? null,
        refMax: t.refMax ?? null,
        valueType: t.valueType,
        selectOptions: Array.isArray(t.selectOptions) ? t.selectOptions : [],
        order: t.order,
        refRanges: t.refRanges ?? [],
      }));
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}/template-snapshot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: snapshotItems }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Error al quitar parámetro");
        return;
      }
      remove(item.index);
      setAdditionalItems((prev) => prev.filter((a) => a.id !== item.id));
      toast.success("Parámetro quitado");
      onParamAdded?.();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setRemovingParamId(null);
    }
  };

  const handleEditParam = (item: TemplateItem & { index: number }) => {
    setEditingParam(item);
    setEditParamGroup(item.groupName ?? "");
    setEditParamName(item.paramName);
    setEditParamModalOpen(true);
  };

  const handleSaveEditParam = async () => {
    if (!editingParam) return;
    const paramName = editParamName.trim() || "Nuevo parámetro";
    const groupName = editParamGroup.trim() || null;
    setEditParamModalOpen(false);
    setEditingParam(null);

    const updatedItem: TemplateItem = {
      ...editingParam,
      paramName,
      groupName,
    };
    setAdditionalItems((prev) =>
      prev.map((t) => (t.id === editingParam.id ? updatedItem : t))
    );
    form.setValue(`items.${editingParam.index}.paramNameSnapshot`, paramName);

    setUpdatingParamId(editingParam.id);
    try {
      const snapshotItems = allTemplateItemsForSave.map((t) =>
        t.id === editingParam.id ? updatedItem : t
      ).map((t) => ({
        id: t.id,
        groupName: t.groupName ?? null,
        paramName: t.paramName,
        unit: t.unit ?? null,
        refRangeText: t.refRangeText ?? null,
        refMin: t.refMin ?? null,
        refMax: t.refMax ?? null,
        valueType: t.valueType,
        selectOptions: Array.isArray(t.selectOptions) ? t.selectOptions : [],
        order: t.order,
        refRanges: t.refRanges ?? [],
      }));
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}/template-snapshot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: snapshotItems }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Error al actualizar parámetro");
        setAdditionalItems((prev) =>
          prev.map((t) => (t.id === editingParam.id ? editingParam : t))
        );
        form.setValue(`items.${editingParam.index}.paramNameSnapshot`, editingParam.paramName);
      } else {
        toast.success("Parámetro actualizado");
        onParamAdded?.();
      }
    } catch {
      toast.error("Error de conexión");
      setAdditionalItems((prev) =>
        prev.map((t) => (t.id === editingParam.id ? editingParam : t))
      );
      form.setValue(`items.${editingParam.index}.paramNameSnapshot`, editingParam.paramName);
    } finally {
      setUpdatingParamId(null);
    }
  };

  const isAdditionalParam = (item: TemplateItem & { index: number }) =>
    additionalItems.some((a) => a.id === item.id);

  const handleSave = async () => {
    const values = form.getValues();
    const items = values.items ?? [];
    if (items.length === 0) {
      toast.error("No hay parámetros para guardar");
      return;
    }
    const validatedItems = items.map((item, idx) => {
      const t = allTemplateItemsForSave[idx];
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AutosaveIndicator status={status} savedAt={savedAt} onRetry={retry} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="reportedBy" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Reportado por
          </label>
          <Input
            id="reportedBy"
            {...form.register("reportedBy")}
            placeholder="Nombre del responsable"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="comment" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Comentario (opcional)
          </label>
          <Input
            id="comment"
            {...form.register("comment")}
            placeholder="Observaciones"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Usa <kbd className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px]">Tab</kbd> o{" "}
        <kbd className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px]">Enter</kbd> para
        desplazarte entre parámetros. Guardado automático.
      </p>

      <div className="rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="relative z-10 p-4 space-y-4">
          {groupNames.map((groupName) => {
            const items = groupedItemsSorted[groupName] ?? [];
            return (
            <div key={`${groupName}-${groupNames.indexOf(groupName)}`} className="space-y-2">
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
                            {item.valueType === "SELECT" && (item.selectOptions?.length ?? 0) > 0 ? (
                              <select
                                value={value}
                                onChange={(e) => form.setValue(`items.${formIndex}.value`, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, formIndex)}
                                ref={(el) => {
                                  inputRefs.current[globalIdx] = el as HTMLInputElement | null;
                                }}
                                className={`h-9 flex-1 min-w-0 text-sm rounded-md border border-slate-300 px-3 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 ${
                                  isHighlighted ? "font-bold" : ""
                                }`}
                              >
                                <option value="">Seleccionar</option>
                                {item.selectOptions.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
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
                            )}
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
                            {isAdditionalParam(item) && (
                              <button
                                type="button"
                                aria-label="Editar parámetro"
                                title="Editar nombre y grupo"
                                onClick={() => handleEditParam(item)}
                                disabled={updatingParamId === item.id}
                                className="shrink-0 h-9 w-9 rounded border border-slate-300 bg-slate-50 text-slate-500 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-teal-950/30 dark:hover:text-teal-400 dark:hover:border-teal-900"
                              >
                                <Pencil className="h-4 w-4 mx-auto" />
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label="Quitar parámetro"
                              title="Quitar parámetro (solo para este paciente)"
                              onClick={() => setParamToRemove(item)}
                              disabled={removingParamId === item.id || itemsToUse.length <= 1}
                              className="shrink-0 h-9 w-9 rounded border border-slate-300 bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-900"
                            >
                              <Trash2 className="h-4 w-4 mx-auto" />
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
          );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddParamModalOpen(true)}
            disabled={addingParam}
            className="gap-1.5"
            title="Añade un parámetro solo para este paciente (no modifica la plantilla del análisis)"
          >
            <Plus className="h-4 w-4" />
            Parámetro adicional
          </Button>
          <Dialog
            open={addParamModalOpen}
            onOpenChange={(open) => {
              setAddParamModalOpen(open);
              if (!open) {
                setAddParamGroup("");
                setAddParamName("Nuevo parámetro");
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Añadir parámetro</DialogTitle>
                <DialogDescription>
                  El parámetro se guardará solo para este paciente. En el PDF se mostrará agrupado correctamente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="addParamGroup" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Grupo (opcional)
                  </label>
                  <Input
                    id="addParamGroup"
                    value={addParamGroup}
                    onChange={(e) => setAddParamGroup(e.target.value)}
                    placeholder="Ej. Microscópico, Químico... (vacío = General)"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="addParamName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nombre del parámetro
                  </label>
                  <Input
                    id="addParamName"
                    value={addParamName}
                    onChange={(e) => setAddParamName(e.target.value)}
                    placeholder="Nuevo parámetro"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddParamModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleAddParam}>
                  Añadir
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog
            open={paramToRemove != null}
            onOpenChange={(open) => {
              if (!open) setParamToRemove(null);
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirmar</DialogTitle>
                <DialogDescription>¿Seguro que quieres borrar?</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setParamToRemove(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmRemove}
                  disabled={paramToRemove != null && removingParamId === paramToRemove.id}
                >
                  Borrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog
            open={editParamModalOpen}
            onOpenChange={(open) => {
              setEditParamModalOpen(open);
              if (!open) {
                setEditingParam(null);
                setEditParamGroup("");
                setEditParamName("");
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Editar parámetro</DialogTitle>
                <DialogDescription>
                  Modifica el nombre y grupo del parámetro adicional.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="editParamGroup" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Grupo (opcional)
                  </label>
                  <Input
                    id="editParamGroup"
                    value={editParamGroup}
                    onChange={(e) => setEditParamGroup(e.target.value)}
                    placeholder="Ej. Microscópico, Químico... (vacío = General)"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="editParamName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nombre del parámetro
                  </label>
                  <Input
                    id="editParamName"
                    value={editParamName}
                    onChange={(e) => setEditParamName(e.target.value)}
                    placeholder="Nuevo parámetro"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditParamModalOpen(false);
                    setEditingParam(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="button" onClick={handleSaveEditParam}>
                  Guardar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
        <Button type="button" onClick={handleSave} disabled={saving} className="min-w-[140px]">
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

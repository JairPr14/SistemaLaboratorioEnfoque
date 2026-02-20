"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
  valueType: "NUMBER" | "TEXT" | "SELECT";
  selectOptions: string[];
  order: number;
  refRanges?: RefRange[];
};

type Props = {
  orderId: string;
  itemId: string;
  templateItems: TemplateItem[];
  defaultValues?: ResultFormValues;
};

function checkOutOfRange(value: string, refMin: number | null, refMax: number | null): boolean {
  if (!value || value.trim() === "") return false;
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return false;
  if (refMin !== null && numValue < refMin) return true;
  if (refMax !== null && numValue > refMax) return true;
  return false;
}

export function ResultForm({
  orderId,
  itemId,
  templateItems,
  defaultValues,
}: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [viewMode, setViewMode] = useState<"table" | "form">("table");
  const [editableRefs, setEditableRefs] = useState<Record<number, boolean>>({});

  const form = useForm<ResultFormValues>({
    resolver: zodResolver(resultSchema) as Resolver<ResultFormValues>,
    defaultValues: defaultValues ?? {
      reportedBy: "",
      comment: "",
      items: templateItems.length > 0
        ? templateItems.map((item) => ({
            templateItemId: item.id,
            paramNameSnapshot: item.paramName,
            unitSnapshot: item.unit,
            refTextSnapshot: item.refRangeText,
            refMinSnapshot: item.refMin ?? undefined,
            refMaxSnapshot: item.refMax ?? undefined,
            value: "",
            isOutOfRange: false,
            order: item.order,
          }))
        : [
            // Si no hay items, crear uno vacío para que el usuario pueda agregar
            {
              templateItemId: undefined,
              paramNameSnapshot: "",
              unitSnapshot: "",
              refTextSnapshot: "",
              refMinSnapshot: undefined,
              refMaxSnapshot: undefined,
              value: "",
              isOutOfRange: false,
              order: 1,
            },
          ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { status, savedAt, saveOnBlur, retry } = useAutosaveResults({
    orderId,
    itemId,
    form,
    debounceMs: 1000,
    enabled: fields.length > 0,
  });

  // Rellenar "Reportado por" con el usuario en sesión cuando no hay valor previo
  useEffect(() => {
    if (session?.user && !defaultValues?.reportedBy) {
      const value = session.user.name ?? session.user.email ?? "";
      if (value) form.setValue("reportedBy", value);
    }
  }, [session?.user, session?.user?.name, session?.user?.email, defaultValues?.reportedBy, form]);

  // Determinar automáticamente el modo según la cantidad de parámetros
  useEffect(() => {
    const itemCount = templateItems.length > 0 ? templateItems.length : fields.length;
    if (itemCount <= 3) {
      setViewMode("form");
    } else {
      setViewMode("table");
    }
  }, [templateItems.length, fields.length]);

  const addNewParameter = () => {
    append({
      templateItemId: undefined,
      paramNameSnapshot: "",
      unitSnapshot: "",
      refTextSnapshot: "",
      refMinSnapshot: undefined,
      refMaxSnapshot: undefined,
      value: "",
      isOutOfRange: false,
      order: fields.length + 1,
    });
  };

  const toggleEditRefs = (index: number) => {
    setEditableRefs((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Agrupar items por grupoName
  // Si no hay templateItems pero hay fields en el formulario, crear items desde los fields
  const itemsToUse =
    templateItems.length > 0
      ? templateItems
      : fields.map((field, idx) => ({
          id: `field-${idx}`,
          groupName: null,
          paramName: form.watch(`items.${idx}.paramNameSnapshot`) || "",
          unit: form.watch(`items.${idx}.unitSnapshot`) || null,
          refRangeText: form.watch(`items.${idx}.refTextSnapshot`) || null,
          refMin: form.watch(`items.${idx}.refMinSnapshot`) ?? null,
          refMax: form.watch(`items.${idx}.refMaxSnapshot`) ?? null,
          valueType: "TEXT" as const,
          selectOptions: [],
          order: idx + 1,
        }));

  const groupedItems = itemsToUse.reduce(
    (acc, item, index) => {
      const groupKey = item.groupName || "Sin grupo";
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push({ ...item, index });
      return acc;
    },
    {} as Record<string, Array<TemplateItem & { index: number }>>,
  );

  const isSimple = itemsToUse.length <= 3;

  const onSubmit = async (values: ResultFormValues) => {
    try {
      // Validar rangos antes de enviar y asegurar que todos los snapshots estén completos
      const validatedItems = values.items.map((item, idx) => {
        const templateItem = templateItems[idx];
        const refMin = item.refMinSnapshot ?? templateItem?.refMin ?? null;
        const refMax = item.refMaxSnapshot ?? templateItem?.refMax ?? null;
        const isOutOfRange = checkOutOfRange(item.value, refMin, refMax);
        
        return {
          ...item,
          // Asegurar que los snapshots estén completos
          paramNameSnapshot: item.paramNameSnapshot || templateItem?.paramName || "",
          unitSnapshot: item.unitSnapshot ?? templateItem?.unit ?? null,
          refTextSnapshot: item.refTextSnapshot ?? templateItem?.refRangeText ?? null,
          refMinSnapshot: refMin,
          refMaxSnapshot: refMax,
          isOutOfRange,
        };
      });

      const res = await fetch(
        `/api/orders/${orderId}/items/${itemId}/result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, items: validatedItems }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "No se pudo guardar el resultado.");
        return;
      }

      toast.success("Resultado guardado.");
      router.refresh();
    } catch (error) {
      console.error("Error submitting result form:", error);
      toast.error("Error de conexión. Intenta nuevamente.");
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      onBlur={() => saveOnBlur()}
      className="space-y-6"
    >
      <div className="flex items-center justify-between gap-4 min-h-6">
        <AutosaveIndicator status={status} savedAt={savedAt} onRetry={retry} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Reportado por</Label>
          <Input {...form.register("reportedBy")} placeholder="Ej: Bioquímica" />
        </div>
        <div className="space-y-2">
          <Label>Comentario general</Label>
          <Textarea {...form.register("comment")} placeholder="Observaciones adicionales..." />
        </div>
      </div>

      {/* Selector de vista solo para análisis complejos */}
      {!isSimple && (
        <div className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="text-xs text-blue-800">
            💡 <strong>Plantilla personalizada del paciente:</strong> Esta es una copia editable de la plantilla estándar. 
            Puedes modificar nombres, valores referenciales, unidades o agregar parámetros adicionales. 
            Los cambios solo afectan a este paciente, la plantilla original permanece intacta.
          </div>
          <div className="flex gap-2 rounded-md border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-xs rounded ${
                viewMode === "table"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Vista Tabla
            </button>
            <button
              type="button"
              onClick={() => setViewMode("form")}
              className={`px-3 py-1 text-xs rounded ${
                viewMode === "form"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Vista Formulario
            </button>
          </div>
        </div>
      )}

      {viewMode === "table" ? (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([groupName, items]) => (
            <div key={groupName} className="rounded-lg border border-slate-200 overflow-hidden">
              {groupName !== "Sin grupo" && (
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase">
                    {groupName}
                  </h3>
                </div>
              )}
              <div className="-mx-1 overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Parámetro</TableHead>
                      <TableHead className="w-24">Unidad</TableHead>
                      <TableHead className="w-32">Valor Referencial</TableHead>
                      <TableHead className="w-40">Resultado</TableHead>
                      <TableHead className="w-32">Rangos Adicionales</TableHead>
                      <TableHead className="w-20">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const formIndex = item.index;
                      const currentValue = form.watch(`items.${formIndex}.value`);
                      const currentRefText = form.watch(`items.${formIndex}.refTextSnapshot`);
                      const currentRefMin = form.watch(`items.${formIndex}.refMinSnapshot`);
                      const currentRefMax = form.watch(`items.${formIndex}.refMaxSnapshot`);
                      const currentParamName = form.watch(`items.${formIndex}.paramNameSnapshot`);
                      const currentUnit = form.watch(`items.${formIndex}.unitSnapshot`);
                      const isEditingRefs = editableRefs[formIndex];
                      const isOutOfRange = checkOutOfRange(
                        currentValue,
                        currentRefMin ?? null,
                        currentRefMax ?? null,
                      );
                      const hasValue = currentValue && currentValue.trim() !== "";

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs text-slate-500">
                            {form.watch(`items.${formIndex}.order`) || item.order}
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs font-medium border-transparent hover:border-slate-300 focus:border-slate-400"
                              placeholder="Nombre parámetro"
                              value={currentParamName}
                              onChange={(e) =>
                                form.setValue(`items.${formIndex}.paramNameSnapshot`, e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs w-20 border-transparent hover:border-slate-300 focus:border-slate-400"
                              placeholder="g/dL"
                              value={currentUnit || ""}
                              onChange={(e) =>
                                form.setValue(`items.${formIndex}.unitSnapshot`, e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 items-center">
                              {isEditingRefs ? (
                                <>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 text-xs w-16 border-slate-300"
                                    placeholder="Min"
                                    value={currentRefMin ?? ""}
                                    onChange={(e) =>
                                      form.setValue(
                                        `items.${formIndex}.refMinSnapshot`,
                                        e.target.value ? parseFloat(e.target.value) : undefined,
                                      )
                                    }
                                  />
                                  <span className="text-xs">-</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 text-xs w-16 border-slate-300"
                                    placeholder="Max"
                                    value={currentRefMax ?? ""}
                                    onChange={(e) =>
                                      form.setValue(
                                        `items.${formIndex}.refMaxSnapshot`,
                                        e.target.value ? parseFloat(e.target.value) : undefined,
                                      )
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleEditRefs(formIndex)}
                                    className="text-xs text-slate-600 hover:text-slate-900"
                                  >
                                    ✓
                                  </button>
                                </>
                              ) : (
                                <>
                                  <Input
                                    className="h-8 text-xs w-32 border-transparent hover:border-slate-300 focus:border-slate-400"
                                    placeholder="12-16"
                                    value={currentRefText || ""}
                                    onChange={(e) =>
                                      form.setValue(`items.${formIndex}.refTextSnapshot`, e.target.value)
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleEditRefs(formIndex)}
                                    className="text-xs text-slate-500 hover:text-slate-700"
                                    title="Editar rangos numéricos"
                                  >
                                    ✏️
                                  </button>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="w-40 align-top">
                            {item.valueType === "SELECT" ? (
                              <select
                                className={`h-9 w-full rounded-md border px-2 text-sm ${
                                  hasValue && isOutOfRange
                                    ? "border-red-500 bg-red-50 font-bold underline dark:bg-red-900/20 dark:text-red-200"
                                    : "border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                }`}
                                {...form.register(`items.${formIndex}.value`)}
                              >
                                <option value="">-</option>
                                {item.selectOptions.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                type={item.valueType === "NUMBER" ? "number" : "text"}
                                step={item.valueType === "NUMBER" ? "0.01" : undefined}
                                className={`h-9 w-full text-sm ${
                                  hasValue && isOutOfRange
                                    ? "border-red-500 bg-red-50 font-bold underline"
                                    : ""
                                }`}
                                placeholder="-"
                                {...form.register(`items.${formIndex}.value`)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const nextIndex = formIndex + 1;
                                    if (nextIndex < fields.length) {
                                      const nextInput = document.querySelector(
                                        `input[name="items.${nextIndex}.value"]`,
                                      ) as HTMLInputElement;
                                      nextInput?.focus();
                                    }
                                  }
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell className="w-32 align-top">
                            {item.refRanges && item.refRanges.length > 0 ? (
                              <div className="bg-slate-50 rounded-md p-2 border border-slate-200 space-y-1.5">
                                {item.refRanges.map((range, rangeIdx) => {
                                  const ageGroupLabels: Record<string, string> = {
                                    NIÑOS: "Niños",
                                    JOVENES: "Jóvenes",
                                    ADULTOS: "Adultos",
                                  };
                                  const sexLabels: Record<string, string> = {
                                    M: "Hombres",
                                    F: "Mujeres",
                                    O: "Otros",
                                  };
                                  const criteria = [
                                    range.ageGroup ? ageGroupLabels[range.ageGroup] || range.ageGroup : null,
                                    range.sex ? sexLabels[range.sex] || range.sex : null,
                                  ].filter(Boolean);
                                  
                                  const rangeDisplay = range.refRangeText 
                                    || (range.refMin !== null && range.refMax !== null 
                                      ? `${range.refMin} - ${range.refMax}` 
                                      : "");
                                  
                                  return (
                                    <div key={rangeIdx} className="text-[10px] text-slate-700 leading-tight">
                                      {criteria.length > 0 ? (
                                        <div>
                                          <span className="font-semibold text-slate-800">
                                            {criteria.join(" + ")}:
                                          </span>
                                          <span className="text-slate-600 ml-1">{rangeDisplay}</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-600">{rangeDisplay}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasValue && (
                              <Badge
                                variant={isOutOfRange ? "danger" : "success"}
                                className="text-xs"
                              >
                                {isOutOfRange ? "Fuera" : "OK"}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
          
          {/* Botón para agregar parámetros adicionales */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addNewParameter}
            >
              + Agregar parámetro adicional
            </Button>
          </div>

          {/* Mostrar parámetros adicionales agregados */}
          {fields.length > templateItems.length && (
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
              <h4 className="text-sm font-semibold text-amber-900 mb-3">
                Parámetros adicionales ({fields.length - templateItems.length})
              </h4>
              <div className="-mx-1 overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Parámetro</TableHead>
                      <TableHead className="w-24">Unidad</TableHead>
                      <TableHead className="w-32">Valor Referencial</TableHead>
                      <TableHead className="w-40">Resultado</TableHead>
                      <TableHead className="w-32">Rangos Adicionales</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.slice(templateItems.length).map((field, idx) => {
                      const formIndex = templateItems.length + idx;
                      const currentRefText = form.watch(`items.${formIndex}.refTextSnapshot`);
                      const currentRefMin = form.watch(`items.${formIndex}.refMinSnapshot`);
                      const currentRefMax = form.watch(`items.${formIndex}.refMaxSnapshot`);
                      const isEditingRefs = editableRefs[formIndex];

                      return (
                        <TableRow key={field.id}>
                          <TableCell className="text-xs text-slate-500">
                            {form.watch(`items.${formIndex}.order`) || formIndex + 1}
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs font-medium"
                              placeholder="Nombre parámetro"
                              value={form.watch(`items.${formIndex}.paramNameSnapshot`) || ""}
                              onChange={(e) =>
                                form.setValue(`items.${formIndex}.paramNameSnapshot`, e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs w-20"
                              placeholder="g/dL"
                              value={form.watch(`items.${formIndex}.unitSnapshot`) || ""}
                              onChange={(e) =>
                                form.setValue(`items.${formIndex}.unitSnapshot`, e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 items-center">
                              {isEditingRefs ? (
                                <>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 text-xs w-16"
                                    placeholder="Min"
                                    value={currentRefMin ?? ""}
                                    onChange={(e) =>
                                      form.setValue(
                                        `items.${formIndex}.refMinSnapshot`,
                                        e.target.value ? parseFloat(e.target.value) : undefined,
                                      )
                                    }
                                  />
                                  <span className="text-xs">-</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 text-xs w-16"
                                    placeholder="Max"
                                    value={currentRefMax ?? ""}
                                    onChange={(e) =>
                                      form.setValue(
                                        `items.${formIndex}.refMaxSnapshot`,
                                        e.target.value ? parseFloat(e.target.value) : undefined,
                                      )
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleEditRefs(formIndex)}
                                    className="text-xs"
                                  >
                                    ✓
                                  </button>
                                </>
                              ) : (
                                <>
                                  <Input
                                    className="h-8 text-xs w-32"
                                    placeholder="12-16"
                                    value={currentRefText || ""}
                                    onChange={(e) =>
                                      form.setValue(`items.${formIndex}.refTextSnapshot`, e.target.value)
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleEditRefs(formIndex)}
                                    className="text-xs"
                                  >
                                    ✏️
                                  </button>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="w-40 align-top">
                            <Input
                              type="text"
                              className="h-9 w-full text-sm"
                              placeholder="Resultado"
                              {...form.register(`items.${formIndex}.value`)}
                            />
                          </TableCell>
                          <TableCell className="w-32 align-top">
                            {(() => {
                              // Buscar el templateItem original si existe
                              const originalItem = templateItems.find((t) => t.id === form.watch(`items.${formIndex}.templateItemId`));
                              const refRanges = originalItem?.refRanges || [];
                              
                              return refRanges.length > 0 ? (
                                <div className="bg-slate-50 rounded-md p-2 border border-slate-200 space-y-1.5">
                                  {refRanges.map((range, rangeIdx) => {
                                    const ageGroupLabels: Record<string, string> = {
                                      NIÑOS: "Niños",
                                      JOVENES: "Jóvenes",
                                      ADULTOS: "Adultos",
                                    };
                                    const sexLabels: Record<string, string> = {
                                      M: "Hombres",
                                      F: "Mujeres",
                                      O: "Otros",
                                    };
                                    const criteria = [
                                      range.ageGroup ? ageGroupLabels[range.ageGroup] || range.ageGroup : null,
                                      range.sex ? sexLabels[range.sex] || range.sex : null,
                                    ].filter(Boolean);
                                    
                                    const rangeDisplay = range.refRangeText 
                                      || (range.refMin !== null && range.refMax !== null 
                                        ? `${range.refMin} - ${range.refMax}` 
                                        : "");
                                    
                                    return (
                                      <div key={rangeIdx} className="text-[10px] text-slate-700 leading-tight">
                                        {criteria.length > 0 ? (
                                          <div>
                                            <span className="font-semibold text-slate-800">
                                              {criteria.join(" + ")}:
                                            </span>
                                            <span className="text-slate-600 ml-1">{rangeDisplay}</span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-600">{rangeDisplay}</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">-</span>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600"
                              onClick={() => remove(formIndex)}
                            >
                              ×
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([groupName, items]) => (
            <div key={groupName} className="rounded-lg border-2 border-slate-300 bg-slate-50">
              {groupName !== "Sin grupo" && (
                <div className="border-b border-slate-300 bg-white px-4 py-3">
                  <h3 className="text-base font-semibold text-slate-900 uppercase">
                    {groupName}
                  </h3>
                </div>
              )}
              <div className="p-4 space-y-4">
                {items.map((item) => {
                  const formIndex = item.index;
                  const currentValue = form.watch(`items.${formIndex}.value`);
                  const currentRefText = form.watch(`items.${formIndex}.refTextSnapshot`);
                  const currentRefMin = form.watch(`items.${formIndex}.refMinSnapshot`);
                  const currentRefMax = form.watch(`items.${formIndex}.refMaxSnapshot`);
                  const isOutOfRange = checkOutOfRange(
                    currentValue,
                    currentRefMin ?? null,
                    currentRefMax ?? null,
                  );
                  const hasValue = currentValue && currentValue.trim() !== "";
                  const isEditingRefs = editableRefs[formIndex];

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-md border p-4 ${
                        hasValue && isOutOfRange ? "border-red-300 bg-red-50" : "border-slate-200"
                      }`}
                    >
                      <div className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-4">
                          <Input
                            className="text-sm font-semibold text-slate-900 mb-2"
                            placeholder="Nombre parámetro"
                            value={form.watch(`items.${formIndex}.paramNameSnapshot`) || ""}
                            onChange={(e) =>
                              form.setValue(`items.${formIndex}.paramNameSnapshot`, e.target.value)
                            }
                          />
                          <div className="flex gap-2 items-center">
                            <Input
                              className="text-xs w-20"
                              placeholder="Unidad"
                              value={form.watch(`items.${formIndex}.unitSnapshot`) || ""}
                              onChange={(e) =>
                                form.setValue(`items.${formIndex}.unitSnapshot`, e.target.value)
                              }
                            />
                            {isEditingRefs ? (
                              <div className="flex gap-1 items-center">
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="text-xs w-16"
                                  placeholder="Min"
                                  value={currentRefMin ?? ""}
                                  onChange={(e) =>
                                    form.setValue(
                                      `items.${formIndex}.refMinSnapshot`,
                                      e.target.value ? parseFloat(e.target.value) : undefined,
                                    )
                                  }
                                />
                                <span className="text-xs">-</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="text-xs w-16"
                                  placeholder="Max"
                                  value={currentRefMax ?? ""}
                                  onChange={(e) =>
                                    form.setValue(
                                      `items.${formIndex}.refMaxSnapshot`,
                                      e.target.value ? parseFloat(e.target.value) : undefined,
                                    )
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleEditRefs(formIndex)}
                                  className="text-xs"
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex gap-1 items-center">
                                  <Input
                                    className="text-xs w-32"
                                    placeholder="Ref: 12-16"
                                    value={currentRefText || ""}
                                    onChange={(e) =>
                                      form.setValue(`items.${formIndex}.refTextSnapshot`, e.target.value)
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleEditRefs(formIndex)}
                                    className="text-xs text-slate-500"
                                    title="Editar rangos"
                                  >
                                    ✏️
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                          {hasValue && isOutOfRange && (
                            <Badge variant="danger" className="mt-2 text-xs">
                              ⚠️ Fuera de rango
                            </Badge>
                          )}
                        </div>
                        <div className="col-span-8">
                          <div className="space-y-2">
                            {/* Campo de resultado */}
                            <div>
                              {item.valueType === "SELECT" ? (
                                <select
                                  className={`h-10 w-full rounded-md border bg-white px-3 text-sm ${
                                    hasValue && isOutOfRange
                                      ? "border-red-500 font-bold underline"
                                      : "border-slate-200"
                                  }`}
                                  {...form.register(`items.${formIndex}.value`)}
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
                                  type={item.valueType === "NUMBER" ? "number" : "text"}
                                  step={item.valueType === "NUMBER" ? "0.01" : undefined}
                                  placeholder="Ingrese el resultado"
                                  className={
                                    hasValue && isOutOfRange
                                      ? "border-red-500 font-bold underline"
                                      : ""
                                  }
                                  {...form.register(`items.${formIndex}.value`)}
                                />
                              )}
                            </div>
                            {/* Rangos referenciales adicionales debajo del resultado */}
                            {item.refRanges && item.refRanges.length > 0 && (
                              <div className="bg-slate-50 rounded-md p-3 border border-slate-200 space-y-2 min-h-[80px] w-full">
                                <div className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                                  Rangos referenciales:
                                </div>
                                {item.refRanges.map((range, rangeIdx) => {
                                  const ageGroupLabels: Record<string, string> = {
                                    NIÑOS: "Niños",
                                    JOVENES: "Jóvenes",
                                    ADULTOS: "Adultos",
                                  };
                                  const sexLabels: Record<string, string> = {
                                    M: "Hombres",
                                    F: "Mujeres",
                                    O: "Otros",
                                  };
                                  const criteria = [
                                    range.ageGroup ? ageGroupLabels[range.ageGroup] || range.ageGroup : null,
                                    range.sex ? sexLabels[range.sex] || range.sex : null,
                                  ].filter(Boolean);
                                  
                                  const rangeDisplay = range.refRangeText 
                                    || (range.refMin !== null && range.refMax !== null 
                                      ? `${range.refMin} - ${range.refMax}` 
                                      : "");
                                  
                                  return (
                                    <div key={rangeIdx} className="text-xs text-slate-700 leading-relaxed">
                                      {criteria.length > 0 ? (
                                        <div className="flex flex-col gap-0.5">
                                          <span className="font-semibold text-slate-800 text-[11px]">
                                            {criteria.join(" + ")}:
                                          </span>
                                          <span className="text-slate-600 text-[11px] pl-1">{rangeDisplay}</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-600 text-[11px]">{rangeDisplay}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Botón para agregar parámetros adicionales */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={addNewParameter}
            >
              + Agregar parámetro adicional
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" className="min-w-[150px]">
          Guardar resultados
        </Button>
      </div>
    </form>
  );
}

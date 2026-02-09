"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { templateSchema, valueTypeValues } from "@/features/lab/schemas";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { templatePresets } from "@/lib/template-presets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type TemplateFormValues = z.infer<typeof templateSchema>;

type LabTestOption = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  templateId?: string;
  labTests: LabTestOption[];
  defaultValues?: Partial<TemplateFormValues>;
};

export function TemplateForm({ templateId, labTests, defaultValues }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"table" | "form">("table");
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      labTestId: labTests[0]?.id ?? "",
      title: "",
      notes: "",
      items: [
        {
          groupName: "",
          paramName: "",
          unit: "",
          refRangeText: "",
          refMin: undefined,
          refMax: undefined,
          valueType: "NUMBER",
          selectOptions: [],
          order: 1,
        },
      ],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const addMultipleRows = () => {
    const count = parseInt(prompt("¿Cuántas filas desea agregar?", "5") || "5");
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        append({
          groupName: "",
          paramName: "",
          unit: "",
          refRangeText: "",
          refMin: undefined,
          refMax: undefined,
          valueType: "NUMBER",
          selectOptions: [],
          order: fields.length + i + 1,
        });
      }
    }
  };

  const duplicateRow = (index: number) => {
    const currentItem = form.getValues(`items.${index}`);
    append({
      ...currentItem,
      paramName: `${currentItem.paramName} (copia)`,
      order: fields.length + 1,
    });
  };

  const loadPreset = (preset: typeof templatePresets[0]) => {
    if (!confirm(`¿Cargar plantilla predefinida "${preset.name}"? Esto reemplazará los parámetros actuales.`)) {
      return;
    }
    
    form.setValue("title", preset.title);
    form.setValue("notes", preset.notes || "");
    
    // Limpiar items actuales y agregar los del preset
    const currentItems = form.getValues("items");
    currentItems.forEach((_, idx) => remove(0));
    
    preset.items.forEach((item, idx) => {
      append({
        groupName: item.groupName || "",
        paramName: item.paramName,
        unit: item.unit || "",
        refRangeText: item.refRangeText || "",
        refMin: item.refMin,
        refMax: item.refMax,
        valueType: item.valueType,
        selectOptions: item.selectOptions || [],
        order: item.order,
      });
    });
    
    toast.success(`Plantilla "${preset.name}" cargada correctamente.`);
  };

  const onSubmit = async (values: TemplateFormValues) => {
    try {
      const method = templateId ? "PUT" : "POST";
      const url = templateId ? `/api/templates/${templateId}` : "/api/templates";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "No se pudo guardar la plantilla.");
        return;
      }

      toast.success("Plantilla guardada correctamente.");
      router.refresh();
    } catch (error) {
      console.error("Error submitting template form:", error);
      toast.error("Error de conexión. Intenta nuevamente.");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Análisis</Label>
          <select
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            {...form.register("labTestId")}
          >
            {labTests.map((test) => (
              <option key={test.id} value={test.id}>
                {test.code} - {test.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Título</Label>
          <Input {...form.register("title")} placeholder="Ej: Hemograma Completo" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notas</Label>
        <Textarea {...form.register("notes")} placeholder="Notas adicionales sobre la plantilla..." />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-slate-700">
            Parámetros ({fields.length})
          </h3>
          <div className="flex gap-2 flex-wrap">
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  📋 Plantillas Predefinidas
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Plantillas Predefinidas</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2 mt-4">
                  {templatePresets.map((preset) => (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => loadPreset(preset)}
                      className="text-left p-3 rounded-md border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                      <div className="font-semibold text-slate-900">{preset.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {preset.items.length} parámetros
                        {preset.notes && ` · ${preset.notes}`}
                      </div>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "table" ? "form" : "table")}
            >
              {viewMode === "table" ? "Vista Formulario" : "Vista Tabla"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                append({
                  groupName: "",
                  paramName: "",
                  unit: "",
                  refRangeText: "",
                  refMin: undefined,
                  refMax: undefined,
                  valueType: "NUMBER",
                  selectOptions: [],
                  order: fields.length + 1,
                })
              }
            >
              +1 Fila
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addMultipleRows}
            >
              +Múltiples
            </Button>
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50 z-10">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Parámetro</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Ref. Texto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="w-20">Ref. Min</TableHead>
                    <TableHead className="w-20">Ref. Max</TableHead>
                    <TableHead className="w-16">Orden</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="text-xs text-slate-500">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs"
                          placeholder="Grupo"
                          {...form.register(`items.${index}.groupName`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs font-medium"
                          placeholder="Nombre parámetro"
                          {...form.register(`items.${index}.paramName`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs w-20"
                          placeholder="g/dL"
                          {...form.register(`items.${index}.unit`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs w-32"
                          placeholder="12-16"
                          {...form.register(`items.${index}.refRangeText`)}
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
                          {...form.register(`items.${index}.valueType`)}
                        >
                          {valueTypeValues.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-xs w-20"
                          placeholder="Min"
                          {...form.register(`items.${index}.refMin`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-xs w-20"
                          placeholder="Max"
                          {...form.register(`items.${index}.refMax`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 text-xs w-16"
                          {...form.register(`items.${index}.order`)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => duplicateRow(index)}
                            title="Duplicar"
                          >
                            📋
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-600"
                            onClick={() => remove(index)}
                            title="Eliminar"
                          >
                            ×
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-md border border-slate-200 p-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Grupo</Label>
                    <Input {...form.register(`items.${index}.groupName`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Parámetro</Label>
                    <Input {...form.register(`items.${index}.paramName`)} />
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Unidad</Label>
                    <Input {...form.register(`items.${index}.unit`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ref. Texto</Label>
                    <Input {...form.register(`items.${index}.refRangeText`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <select
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      {...form.register(`items.${index}.valueType`)}
                    >
                      {valueTypeValues.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Ref. Min</Label>
                    <Input type="number" step="0.01" {...form.register(`items.${index}.refMin`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ref. Max</Label>
                    <Input type="number" step="0.01" {...form.register(`items.${index}.refMax`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Orden</Label>
                    <Input type="number" {...form.register(`items.${index}.order`)} />
                  </div>
                </div>
                {form.watch(`items.${index}.valueType`) === "SELECT" && (
                  <div className="mt-4 space-y-2">
                    <Label>Opciones (separadas por coma)</Label>
                    <Input
                      value={form.watch(`items.${index}.selectOptions`)?.join(", ") || ""}
                      onChange={(e) =>
                        form.setValue(
                          `items.${index}.selectOptions`,
                          e.target.value
                            .split(",")
                            .map((opt) => opt.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                  </div>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateRow(index)}
                  >
                    Duplicar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" className="min-w-[150px]">
          Guardar plantilla
        </Button>
      </div>
    </form>
  );
}

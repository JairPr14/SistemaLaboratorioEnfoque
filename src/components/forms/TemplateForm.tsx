"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type Resolver, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Search, Check, FileText } from "lucide-react";

import { templateSchema, valueTypeValues, valueTypeLabels } from "@/features/lab/schemas";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { templatePresets } from "@/lib/template-presets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RefRangesManager } from "./RefRangesManager";

type TemplateFormValues = z.infer<typeof templateSchema>;

type LabTestOption = {
  id: string;
  name: string;
  code: string;
  /** Si es false o no viene, el análisis aún no tiene plantilla (prioritario para crear una nueva) */
  hasTemplate?: boolean;
};

type Props = {
  templateId?: string;
  labTests: LabTestOption[];
  defaultValues?: Partial<TemplateFormValues>;
};

export function TemplateForm({ templateId, labTests, defaultValues }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"table" | "form">("form");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const defaultLabTestId =
    labTests.find((t) => !t.hasTemplate)?.id ?? labTests[0]?.id ?? "";

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema) as Resolver<TemplateFormValues>,
    defaultValues: {
      labTestId: defaultLabTestId,
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
                  refRanges: [],
        },
      ],
      ...defaultValues,
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedLabTestId = form.watch("labTestId");
  
  const filteredLabTests = useMemo(() => {
    if (!searchTerm.trim()) return labTests;
    const term = searchTerm.toLowerCase();
    return labTests.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.code.toLowerCase().includes(term)
    );
  }, [labTests, searchTerm]);

  const selectedTest = labTests.find((t) => t.id === watchedLabTestId);

  const moveUp = (index: number) => {
    if (index <= 0) return;
    move(index, index - 1);
    const items = form.getValues("items");
    items.forEach((_, i) => {
      form.setValue(`items.${i}.order`, i + 1);
    });
  };

  const moveDown = (index: number) => {
    if (index >= fields.length - 1) return;
    move(index, index + 1);
    const items = form.getValues("items");
    items.forEach((_, i) => {
      form.setValue(`items.${i}.order`, i + 1);
    });
  };

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
                  refRanges: [],
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
      refRanges: currentItem.refRanges ? [...currentItem.refRanges] : [],
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
    currentItems.forEach(() => remove(0));
    
    preset.items.forEach((item) => {
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
        refRanges: item.refRanges || [],
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

  const onError = () => {
    // Usar form.formState.errors directamente ya que el parámetro puede estar vacío
    const errors = form.formState.errors;
    
    // Debug: mostrar errores en consola solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log("Form validation errors:", errors);
    }
    
    // Buscar errores en los items
    if (errors.items && Array.isArray(errors.items)) {
      const itemErrors = errors.items;
      const firstErrorIndex = itemErrors.findIndex((err) => err !== undefined);
      
      if (firstErrorIndex !== -1) {
        const firstError = itemErrors[firstErrorIndex];
        
        if (firstError?.paramName) {
          const message = firstError.paramName.message || "requiere un nombre de al menos 2 caracteres";
          toast.error(`Parámetro ${firstErrorIndex + 1}: ${message}`);
          return;
        } else if (firstError?.valueType) {
          toast.error(`El parámetro ${firstErrorIndex + 1} requiere un tipo válido.`);
          return;
        } else if (firstError?.order) {
          toast.error(`El parámetro ${firstErrorIndex + 1} requiere un orden válido.`);
          return;
        } else {
          // Mostrar el primer error encontrado
          const errorKeys = Object.keys(firstError);
          if (errorKeys.length > 0) {
            toast.error(`Error en el parámetro ${firstErrorIndex + 1}, campo: ${errorKeys[0]}`);
          } else {
            toast.error(`Error en el parámetro ${firstErrorIndex + 1}. Verifica los datos.`);
          }
          return;
        }
      }
    }
    
    // Verificar otros campos
    if (errors.title) {
      const message = errors.title.message || "debe tener al menos 2 caracteres";
      toast.error(`Título: ${message}`);
      return;
    }
    
    if (errors.labTestId) {
      toast.error("Debes seleccionar un análisis.");
      return;
    }
    
    // Si hay errores pero no los identificamos específicamente
    if (Object.keys(errors).length > 0) {
      toast.error("Por favor, completa todos los campos requeridos correctamente.");
    } else {
      toast.error("Por favor, completa todos los campos requeridos.");
    }
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
      <section className="space-y-4 rounded-lg border border-slate-200/80 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 p-4">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Datos de la plantilla</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300">Análisis</Label>
            
            {/* Botón para abrir modal de búsqueda */}
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setIsAnalysisModalOpen(true);
              }}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-left flex items-center gap-2 hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
            >
              <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
              {selectedTest ? (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {selectedTest.code}
                  </span>
                  <span className="text-sm text-slate-900 dark:text-slate-100 truncate">
                    {selectedTest.name}
                  </span>
                  {selectedTest.hasTemplate && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex-shrink-0">
                      Con plantilla
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400">Buscar análisis...</span>
              )}
            </button>
            
            {/* Input hidden para el formulario */}
            <input type="hidden" {...form.register("labTestId")} />
            
            {labTests.some((t) => !t.hasTemplate) && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Haz clic para buscar y seleccionar un análisis.
              </p>
            )}
            
            {/* Modal de búsqueda de análisis */}
            <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
              <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Seleccionar análisis</DialogTitle>
                </DialogHeader>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 rounded-lg"
                    autoFocus
                  />
                </div>
                
                {/* Lista de análisis */}
                <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 min-h-[300px] max-h-[400px]">
                  {(() => {
                    const withoutTemplate = filteredLabTests.filter((t) => !t.hasTemplate);
                    const withTemplate = filteredLabTests.filter((t) => t.hasTemplate);
                    
                    if (filteredLabTests.length === 0 && searchTerm) {
                      return (
                        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          <Search className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                          No se encontraron análisis para &quot;{searchTerm}&quot;
                        </div>
                      );
                    }
                    
                    if (labTests.length === 0) {
                      return (
                        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          No hay análisis en el catálogo
                        </div>
                      );
                    }
                    
                    return (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {withoutTemplate.length > 0 && (
                          <div>
                            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/30 sticky top-0 z-10">
                              <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                Sin plantilla — elegir para crear ({withoutTemplate.length})
                              </span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                              {withoutTemplate.map((test) => (
                                <button
                                  key={test.id}
                                  type="button"
                                  onClick={() => {
                                    form.setValue("labTestId", test.id);
                                    setIsAnalysisModalOpen(false);
                                  }}
                                  className={`w-full px-3 py-3 text-left transition-colors flex items-center gap-3 ${
                                    watchedLabTestId === test.id
                                      ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500"
                                      : "hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-4 border-transparent"
                                  }`}
                                >
                                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                    watchedLabTestId === test.id
                                      ? "bg-blue-500 text-white"
                                      : "bg-slate-200 dark:bg-slate-600"
                                  }`}>
                                    {watchedLabTestId === test.id && <Check className="h-3.5 w-3.5" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                        {test.code}
                                      </span>
                                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {test.name}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {withTemplate.length > 0 && (
                          <div>
                            <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800/30 sticky top-0 z-10">
                              <span className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                                <Check className="h-3.5 w-3.5" />
                                Ya tienen plantilla ({withTemplate.length})
                              </span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                              {withTemplate.map((test) => (
                                <button
                                  key={test.id}
                                  type="button"
                                  onClick={() => {
                                    form.setValue("labTestId", test.id);
                                    setIsAnalysisModalOpen(false);
                                  }}
                                  className={`w-full px-3 py-3 text-left transition-colors flex items-center gap-3 ${
                                    watchedLabTestId === test.id
                                      ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500"
                                      : "hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-4 border-transparent"
                                  }`}
                                >
                                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                    watchedLabTestId === test.id
                                      ? "bg-blue-500 text-white"
                                      : "bg-green-100 dark:bg-green-800/50 text-green-600 dark:text-green-400"
                                  }`}>
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                        {test.code}
                                      </span>
                                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {test.name}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300">Título</Label>
            <Input
              {...form.register("title")}
              placeholder="Ej: Hemograma completo"
              className="rounded-lg"
            />
            {form.formState.errors.title && (
              <p className="text-xs text-red-500 mt-0.5">
                El título debe tener al menos 2 caracteres
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700 dark:text-slate-300">Notas (opcional)</Label>
          <Textarea
            {...form.register("notes")}
            placeholder="Notas adicionales..."
            className="min-h-[80px] rounded-lg resize-y"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Parámetros <span className="text-slate-500 dark:text-slate-400 font-normal">({fields.length})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
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
                  refRanges: [],
                })
              }
            >
              + Añadir uno
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addMultipleRows}>
              + Varios
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "table" ? "form" : "table")}
            >
              {viewMode === "table" ? "Vista tarjetas" : "Vista tabla"}
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  Plantillas predefinidas
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
                      className="text-left p-3 rounded-md border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
                    >
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{preset.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {preset.items.length} parámetros
                        {preset.notes && ` · ${preset.notes}`}
                      </div>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <Table className="min-w-[800px]">
                <TableHeader className="sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 z-10">
                  <TableRow className="border-slate-200 dark:border-slate-600">
                    <TableHead className="w-10 text-slate-600 dark:text-slate-300">#</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Grupo</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Parámetro</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 w-24">Unidad</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 min-w-[100px]">Ref. texto</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 w-24">Tipo</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 w-20">Min</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 w-20">Max</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 w-14">Ord.</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300 w-32">Rangos</TableHead>
                    <TableHead className="w-32">Ordenar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400">{index + 1}</TableCell>
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
                        {form.formState.errors.items?.[index]?.paramName && (
                          <p className="text-[10px] text-red-500 mt-0.5">
                            Mínimo 2 caracteres
                          </p>
                        )}
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
                          className="h-8 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-xs text-slate-900 dark:text-slate-100"
                          {...form.register(`items.${index}.valueType`)}
                          title="Tipo de dato para la captura de resultados"
                        >
                          {valueTypeValues.map((value) => (
                            <option key={value} value={value}>
                              {valueTypeLabels[value]}
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
                          {...form.register(`items.${index}.refMin`, {
                            setValueAs: (v) => v === "" || v === null || v === undefined ? undefined : Number(v),
                          })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-xs w-20"
                          placeholder="Max"
                          {...form.register(`items.${index}.refMax`, {
                            setValueAs: (v) => v === "" || v === null || v === undefined ? undefined : Number(v),
                          })}
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
                        <RefRangesManager itemIndex={index} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => moveUp(index)}
                            title="Subir"
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => moveDown(index)}
                            title="Bajar"
                            disabled={index === fields.length - 1}
                          >
                            ↓
                          </Button>
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
          <ul className="space-y-3">
            {fields.map((field, index) => (
              <li key={field.id}>
                <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 p-4 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Parámetro {index + 1}</span>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        title="Subir"
                      >
                        ↑ Subir
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => moveDown(index)}
                        disabled={index === fields.length - 1}
                        title="Bajar"
                      >
                        ↓ Bajar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => duplicateRow(index)}
                      >
                        Duplicar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-red-600 hover:text-red-700"
                        onClick={() => remove(index)}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300">Parámetro</Label>
                      <Input
                        className="rounded-lg h-9"
                        placeholder="Nombre"
                        {...form.register(`items.${index}.paramName`)}
                      />
                      {form.formState.errors.items?.[index]?.paramName && (
                        <p className="text-[10px] text-red-500 mt-0.5">
                          Mínimo 2 caracteres
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300">Grupo (opcional)</Label>
                      <Input
                        className="rounded-lg h-9"
                        placeholder="Grupo"
                        {...form.register(`items.${index}.groupName`)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300">Unidad</Label>
                      <Input
                        className="rounded-lg h-9"
                        placeholder="mg/dL"
                        {...form.register(`items.${index}.unit`)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300">Ref. texto</Label>
                      <Input
                        className="rounded-lg h-9"
                        placeholder="12-16"
                        {...form.register(`items.${index}.refRangeText`)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300">Tipo de dato</Label>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
                        {...form.register(`items.${index}.valueType`)}
                        title="Define el tipo de valor que se capturará (modificable en cualquier momento)"
                      >
                        {valueTypeValues.map((v) => (
                          <option key={v} value={v}>{valueTypeLabels[v]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-1 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-slate-600 dark:text-slate-300">Min</Label>
                        <Input
                          type="number"
                          step="0.01"
                          className="rounded-lg h-9"
                          {...form.register(`items.${index}.refMin`, {
                            setValueAs: (v) => v === "" || v === null || v === undefined ? undefined : Number(v),
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 dark:text-slate-300">Max</Label>
                        <Input
                          type="number"
                          step="0.01"
                          className="rounded-lg h-9"
                          {...form.register(`items.${index}.refMax`, {
                            setValueAs: (v) => v === "" || v === null || v === undefined ? undefined : Number(v),
                          })}
                        />
                      </div>
                    </div>
                  </div>
                  {form.watch(`items.${index}.valueType`) === "SELECT" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300">Opciones (separadas por coma)</Label>
                      <Input
                        className="rounded-lg h-9"
                        value={form.watch(`items.${index}.selectOptions`)?.join(", ") || ""}
                        onChange={(e) =>
                          form.setValue(
                            `items.${index}.selectOptions`,
                            e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                          )
                        }
                      />
                    </div>
                  )}
                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-xs text-slate-600 dark:text-slate-300 font-medium">Valores Referenciales</Label>
                    <RefRangesManager itemIndex={index} />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Label className="text-xs text-slate-600 dark:text-slate-300">Orden</Label>
                    <Input
                      type="number"
                      className="rounded-lg h-9 w-16 text-center"
                      {...form.register(`items.${index}.order`)}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-4 border-t border-slate-200 dark:border-slate-600">
        <Button type="submit" className="w-full sm:w-auto sm:min-w-[180px]">
          Guardar plantilla
        </Button>
      </div>
      </form>
    </FormProvider>
  );
}

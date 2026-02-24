"use client";

import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { labTestSchema } from "@/features/lab/schemas";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LabTestFormValues = z.infer<typeof labTestSchema>;

type SectionOption = { id: string; code: string; name: string };
type ReferredLabOption = { id: string; name: string };

type Props = {
  testId?: string;
  defaultValues?: Partial<LabTestFormValues>;
  sections: SectionOption[];
  referredLabs: ReferredLabOption[];
};

export function LabTestForm({ testId, defaultValues, sections, referredLabs }: Props) {
  const router = useRouter();
  const form = useForm<LabTestFormValues>({
    resolver: zodResolver(labTestSchema) as Resolver<LabTestFormValues>,
    defaultValues: {
      code: "",
      name: "",
      sectionId: sections[0]?.id ?? "",
      price: 0,
      estimatedTimeMinutes: undefined,
      isActive: true,
      isReferred: false,
      referredLabId: null,
      priceToAdmission: null,
      externalLabCost: null,
      referredLabOptions: defaultValues?.referredLabOptions ?? [],
      ...defaultValues,
    },
  });
  const isReferredValue = form.watch("isReferred");
  const referredOptions = form.watch("referredLabOptions") ?? [];

  const addReferredOption = () => {
    form.setValue("referredLabOptions", [
      ...referredOptions,
      {
        referredLabId: "",
        priceToAdmission: null,
        externalLabCost: null,
        isDefault: referredOptions.length === 0,
      },
    ]);
  };

  const removeReferredOption = (index: number) => {
    const next = [...referredOptions];
    next.splice(index, 1);
    form.setValue("referredLabOptions", next);
  };

  const onSubmit = async (values: LabTestFormValues) => {
    try {
      const method = testId ? "PUT" : "POST";
      const url = testId ? `/api/tests/${testId}` : "/api/tests";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "No se pudo guardar el análisis.");
        return;
      }

      toast.success("Análisis guardado correctamente.");
      router.refresh();
    } catch (error) {
      console.error("Error submitting test form:", error);
      toast.error("Error de conexión. Intenta nuevamente.");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Código</Label>
          <Input {...form.register("code")} />
        </div>
        <div className="space-y-2">
          <Label>Sección</Label>
          <select
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            {...form.register("sectionId")}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Nombre</Label>
        <Input {...form.register("name")} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Precio público (S/)</Label>
          <Input type="number" step="0.01" {...form.register("price")} />
          <p className="text-xs text-slate-500">Lo que cobra admisión al paciente</p>
        </div>
        <div className="space-y-2">
          <Label>Precio convenio (S/)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="Opcional; si vacío = precio público"
            {...form.register("priceToAdmission")}
          />
          <p className="text-xs text-slate-500">Lo que cobra el laboratorio a admisión</p>
        </div>
        <div className="space-y-2">
          <Label>Tiempo estimado (min)</Label>
          <Input type="number" {...form.register("estimatedTimeMinutes")} />
        </div>
        <div className="flex items-center gap-2 pt-7">
          <input type="checkbox" {...form.register("isActive")} />
          <Label>Activo</Label>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/50">
        <input type="checkbox" id="isReferred" {...form.register("isReferred")} />
        <Label htmlFor="isReferred" className="cursor-pointer font-medium">
          Análisis referido (derivado a otro laboratorio)
        </Label>
      </div>
      {isReferredValue && (
        <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/30">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Laboratorios referidos</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configura uno o varios labs a los que puedes derivar este análisis.
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addReferredOption}>
              + Añadir lab referido
            </Button>
          </div>

          {referredOptions.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No hay labs referidos configurados. Añade al menos uno para marcar este análisis como referido.
            </p>
          ) : (
            <div className="space-y-3">
              {referredOptions.map((opt, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-md border border-slate-200 bg-white/60 p-3 text-xs dark:border-slate-600 dark:bg-slate-900/30 md:grid-cols-4"
                >
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">Laboratorio</Label>
                    <select
                      className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      {...form.register(`referredLabOptions.${index}.referredLabId` as const)}
                    >
                      <option value="">Seleccionar…</option>
                      {referredLabs.map((lab) => (
                        <option key={lab.id} value={lab.id}>
                          {lab.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Precio convenio (S/)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 text-xs"
                      {...form.register(`referredLabOptions.${index}.priceToAdmission` as const)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Costo lab. externo (S/)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 text-xs"
                      {...form.register(`referredLabOptions.${index}.externalLabCost` as const)}
                    />
                  </div>
                  <div className="flex items-center justify-between md:col-span-4">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="h-3 w-3"
                        {...form.register(`referredLabOptions.${index}.isDefault` as const)}
                      />
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">
                        Usar como lab principal por defecto
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeReferredOption(index)}
                      className="text-[11px] text-red-600 hover:underline dark:text-red-400"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}

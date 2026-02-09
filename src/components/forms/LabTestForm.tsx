"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { labTestSchema, sectionValues } from "@/features/lab/schemas";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LabTestFormValues = z.infer<typeof labTestSchema>;

type Props = {
  testId?: string;
  defaultValues?: Partial<LabTestFormValues>;
};

export function LabTestForm({ testId, defaultValues }: Props) {
  const router = useRouter();
  const form = useForm<LabTestFormValues>({
    resolver: zodResolver(labTestSchema),
    defaultValues: {
      code: "",
      name: "",
      section: "BIOQUIMICA",
      price: 0,
      estimatedTimeMinutes: undefined,
      isActive: true,
      ...defaultValues,
    },
  });

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
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            {...form.register("section")}
          >
            {sectionValues.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Nombre</Label>
        <Input {...form.register("name")} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Precio</Label>
          <Input type="number" step="0.01" {...form.register("price")} />
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
      <div className="flex justify-end">
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}

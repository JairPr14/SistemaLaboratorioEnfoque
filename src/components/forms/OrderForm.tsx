"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { orderCreateSchema } from "@/features/lab/schemas";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrderFormValues = z.infer<typeof orderCreateSchema>;

type PatientOption = { id: string; label: string };
type TestOption = { id: string; label: string; price: number };

type Props = {
  patients: PatientOption[];
  tests: TestOption[];
};

export function OrderForm({ patients, tests }: Props) {
  const router = useRouter();
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderCreateSchema),
    defaultValues: {
      patientId: patients[0]?.id ?? "",
      requestedBy: "",
      notes: "",
      labTestIds: [],
    },
  });

  const onSubmit = async (values: OrderFormValues) => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "No se pudo crear la orden.");
        return;
      }

      toast.success("Orden creada correctamente.");
      router.push("/orders");
      router.refresh();
    } catch (error) {
      console.error("Error submitting order form:", error);
      toast.error("Error de conexión. Intenta nuevamente.");
    }
  };

  const selectedIds = new Set(form.watch("labTestIds"));
  const total = tests
    .filter((test) => selectedIds.has(test.id))
    .reduce((acc, test) => acc + test.price, 0);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Paciente</Label>
          <select
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            {...form.register("patientId")}
          >
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Médico solicitante</Label>
          <Input {...form.register("requestedBy")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notas</Label>
        <Input {...form.register("notes")} />
      </div>

      <div className="space-y-2">
        <Label>Análisis seleccionados</Label>
        <div className="grid gap-2 md:grid-cols-2">
          {tests.map((test) => (
            <label
              key={test.id}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                value={test.id}
                checked={selectedIds.has(test.id)}
                onChange={(e) => {
                  const current = new Set(form.getValues("labTestIds"));
                  if (e.target.checked) {
                    current.add(test.id);
                  } else {
                    current.delete(test.id);
                  }
                  form.setValue("labTestIds", Array.from(current), {
                    shouldValidate: true,
                  });
                }}
              />
              <span>{test.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            Total estimado: S/ {total.toFixed(2)}
          </span>
          <Button type="submit">Crear orden</Button>
        </div>
      </div>
    </form>
  );
}

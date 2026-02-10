"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { patientSchema } from "@/features/lab/schemas";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PatientFormValues = z.infer<typeof patientSchema>;

type Props = {
  patientId?: string;
  defaultValues?: Partial<PatientFormValues>;
};

export function PatientForm({ patientId, defaultValues }: Props) {
  const router = useRouter();
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      code: "",
      dni: "",
      firstName: "",
      lastName: "",
      birthDate: "",
      sex: "M",
      phone: "",
      address: "",
      email: "",
      ...defaultValues,
    },
  });

  const onSubmit = async (values: PatientFormValues) => {
    try {
      const method = patientId ? "PUT" : "POST";
      const url = patientId ? `/api/patients/${patientId}` : "/api/patients";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "No se pudo guardar el paciente.");
        return;
      }

      toast.success("Paciente guardado correctamente.");
      router.refresh();
    } catch (error) {
      console.error("Error submitting patient form:", error);
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
          <Label>DNI</Label>
          <Input {...form.register("dni")} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nombres</Label>
          <Input {...form.register("firstName")} />
        </div>
        <div className="space-y-2">
          <Label>Apellidos</Label>
          <Input {...form.register("lastName")} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Fecha de nacimiento</Label>
          <Input type="date" {...form.register("birthDate")} />
        </div>
        <div className="space-y-2">
          <Label>Sexo</Label>
          <select
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            {...form.register("sex")}
          >
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="O">O</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Teléfono</Label>
          <Input {...form.register("phone")} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Dirección</Label>
          <Input {...form.register("address")} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" {...form.register("email")} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
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
  /** Si false, el formulario es solo lectura (solo administradores pueden editar). */
  canEdit?: boolean;
};

export function PatientForm({ patientId, defaultValues, canEdit = true }: Props) {
  const router = useRouter();
  const [nextCode, setNextCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
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

  // Cargar el próximo código disponible cuando es un nuevo paciente
  useEffect(() => {
    if (!patientId) {
      setLoadingCode(true);
      fetch("/api/patients/next-code")
        .then((res) => res.json())
        .then((data) => {
          if (data.code) {
            setNextCode(data.code);
          }
        })
        .catch(() => {
          // Silencioso: si falla, simplemente no mostramos el código
        })
        .finally(() => {
          setLoadingCode(false);
        });
    }
  }, [patientId]);

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

      const data = await res.json().catch(() => ({}));
      const code = data?.item?.code as string | undefined;
      toast.success(
        code
          ? `Paciente guardado correctamente. Código: ${code}`
          : "Paciente guardado correctamente.",
      );
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
          {patientId ? (
            <p className="h-10 flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600">
              {defaultValues?.code ?? "-"}
            </p>
          ) : loadingCode ? (
            <p className="h-10 flex items-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600">
              Cargando...
            </p>
          ) : nextCode ? (
            <p className="h-10 flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-mono font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">
              {nextCode}
            </p>
          ) : (
            <p className="h-10 flex items-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600">
              Se generará automáticamente
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>DNI</Label>
          <Input {...form.register("dni")} disabled={!canEdit} readOnly={!canEdit} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nombres</Label>
          <Input {...form.register("firstName")} disabled={!canEdit} readOnly={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Apellidos</Label>
          <Input {...form.register("lastName")} disabled={!canEdit} readOnly={!canEdit} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Fecha de nacimiento</Label>
          <Input type="date" {...form.register("birthDate")} disabled={!canEdit} readOnly={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Sexo</Label>
          <select
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-70 disabled:cursor-not-allowed"
            {...form.register("sex")}
            disabled={!canEdit}
          >
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="O">O</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Teléfono</Label>
          <Input {...form.register("phone")} disabled={!canEdit} readOnly={!canEdit} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Dirección</Label>
          <Input {...form.register("address")} disabled={!canEdit} readOnly={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" {...form.register("email")} disabled={!canEdit} readOnly={!canEdit} />
        </div>
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit">Guardar</Button>
        </div>
      )}
      {!canEdit && patientId && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Solo los administradores pueden modificar los datos del paciente.
        </p>
      )}
    </form>
  );
}

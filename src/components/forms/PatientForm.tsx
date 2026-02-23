"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { User, Hash, Mail, Phone, MapPin } from "lucide-react";

import { patientSchema } from "@/features/lab/schemas";
import { calculateAge } from "@/lib/template-helpers";
import { toDateTimeLocal } from "@/lib/format";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";

type PatientFormValues = z.infer<typeof patientSchema>;

type Props = {
  patientId?: string;
  defaultValues?: Partial<PatientFormValues>;
  /** Si false, el formulario es solo lectura (solo administradores pueden editar). */
  canEdit?: boolean;
  /** Fecha y hora de creación del registro (solo para pacientes existentes). */
  createdAt?: Date | string;
};

export function PatientForm({ patientId, defaultValues, canEdit = true, createdAt }: Props) {
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
      createdAt: patientId && createdAt ? toDateTimeLocal(createdAt) : toDateTimeLocal(new Date()),
      ...defaultValues,
      ...(createdAt && { createdAt: toDateTimeLocal(createdAt) }),
    },
  });

  // Nuevo paciente: actualizar createdAt cada segundo para mostrar el momento actual
  useEffect(() => {
    if (!patientId) {
      const tick = () => form.setValue("createdAt", toDateTimeLocal(new Date()));
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }
  }, [patientId, form]);

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

  const birthDate = form.watch("birthDate");
  const displayedAge = useMemo(() => {
    if (!birthDate || typeof birthDate !== "string") return null;
    try {
      const date = new Date(birthDate);
      if (isNaN(date.getTime())) return null;
      return calculateAge(date);
    } catch {
      return null;
    }
  }, [birthDate]);

  const onSubmit = async (values: PatientFormValues) => {
    try {
      const method = patientId ? "PUT" : "POST";
      const url = patientId ? `/api/patients/${patientId}` : "/api/patients";

      // Nuevo paciente: usar el momento exacto en que se hace clic en Guardar
      const payload = patientId ? values : { ...values, createdAt: toDateTimeLocal(new Date()) };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="divide-y divide-slate-100 dark:divide-slate-800">
      <FormSection title="Datos del paciente" icon={User} iconBg="teal">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            <Hash className="mr-1 inline-block h-3.5 w-3.5" />
            Código
          </Label>
          {patientId ? (
            <p className="mt-1 h-10 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600">
              {defaultValues?.code ?? "-"}
            </p>
          ) : loadingCode ? (
            <p className="mt-1 h-10 flex items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600">
              Cargando...
            </p>
          ) : nextCode ? (
            <p className="mt-1 h-10 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-mono font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">
              {nextCode}
            </p>
          ) : (
            <p className="mt-1 h-10 flex items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600">
              Se generará automáticamente
            </p>
          )}
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">DNI</Label>
          <Input className="mt-1 rounded-xl" {...form.register("dni")} disabled={!canEdit} readOnly={!canEdit} />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Fecha de creación</Label>
          {patientId ? (
            <Input
              type="datetime-local"
              className="mt-1 rounded-xl"
              {...form.register("createdAt")}
              disabled={!canEdit}
            />
          ) : (
            <Input
              type="datetime-local"
              className="mt-1 rounded-xl read-only:cursor-default"
              {...form.register("createdAt")}
              readOnly
            />
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nombres</Label>
          <Input className="mt-1 rounded-xl" {...form.register("firstName")} disabled={!canEdit} readOnly={!canEdit} placeholder="Ej: Juan Carlos" />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Apellidos</Label>
          <Input className="mt-1 rounded-xl" {...form.register("lastName")} disabled={!canEdit} readOnly={!canEdit} placeholder="Ej: García López" />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Fecha de nacimiento</Label>
          <Input type="date" className="mt-1 rounded-xl" {...form.register("birthDate")} disabled={!canEdit} readOnly={!canEdit} />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Edad</Label>
          <Input
            className="mt-1 rounded-xl read-only:cursor-default read-only:opacity-100"
            value={displayedAge !== null ? `${displayedAge} años` : ""}
            placeholder="Se calcula automáticamente"
            readOnly
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Sexo</Label>
          <select
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-70 disabled:cursor-not-allowed"
            {...form.register("sex")}
            disabled={!canEdit}
          >
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </select>
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            <Phone className="mr-1 inline-block h-3.5 w-3.5" />
            Teléfono
          </Label>
          <Input className="mt-1 rounded-xl" {...form.register("phone")} disabled={!canEdit} readOnly={!canEdit} placeholder="Opcional" />
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            <MapPin className="mr-1 inline-block h-3.5 w-3.5" />
            Dirección
          </Label>
          <Input className="mt-1 rounded-xl" {...form.register("address")} disabled={!canEdit} readOnly={!canEdit} placeholder="Opcional" />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            <Mail className="mr-1 inline-block h-3.5 w-3.5" />
            Email
          </Label>
          <Input type="email" className="mt-1 rounded-xl" {...form.register("email")} disabled={!canEdit} readOnly={!canEdit} placeholder="Opcional" />
        </div>
      </div>
      </FormSection>
      {canEdit && (
        <FormFooter>
          <Button type="submit" className="min-w-[120px] bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500">
            Guardar
          </Button>
        </FormFooter>
      )}
      {!canEdit && patientId && (
        <div className="p-6 sm:p-8">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Solo los administradores pueden modificar los datos del paciente.
          </p>
        </div>
      )}
    </form>
  );
}

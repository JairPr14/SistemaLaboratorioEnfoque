"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PATIENT_TYPE_OPTIONS = [
  { value: "", label: "Sin especificar" },
  { value: "CLINICA", label: "Paciente Clínica" },
  { value: "EXTERNO", label: "Paciente Externo" },
  { value: "IZAGA", label: "Paciente Izaga" },
] as const;

type Props = {
  orderId: string;
  defaultPatientType: string | null;
  defaultRequestedBy: string | null;
  defaultNotes: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditOrderDialog({
  orderId,
  defaultPatientType,
  defaultRequestedBy,
  defaultNotes,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [patientType, setPatientType] = useState(defaultPatientType ?? "");
  const [requestedBy, setRequestedBy] = useState(defaultRequestedBy ?? "");
  const [notes, setNotes] = useState(defaultNotes ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPatientType(defaultPatientType ?? "");
      setRequestedBy(defaultRequestedBy ?? "");
      setNotes(defaultNotes ?? "");
    }
  }, [open, defaultPatientType, defaultRequestedBy, defaultNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientType: patientType || null,
          requestedBy: requestedBy.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "No se pudo actualizar la orden.");
        return;
      }
      toast.success("Orden actualizada.");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Error de conexión.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar orden</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Modifica el tipo de paciente (sede), médico solicitante o notas.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-order-patientType">Tipo de paciente (sede)</Label>
            <select
              id="edit-order-patientType"
              value={patientType}
              onChange={(e) => setPatientType(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              {PATIENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value || "_empty"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-order-requestedBy">Médico solicitante</Label>
            <Input
              id="edit-order-requestedBy"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder="Ej: Dr. García"
              className="rounded-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-order-notes">Notas (opcional)</Label>
            <Input
              id="edit-order-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Indicaciones u observaciones"
              className="rounded-md"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

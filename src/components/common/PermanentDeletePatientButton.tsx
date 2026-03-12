"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  patientId: string;
  patientName?: string;
};

export function PermanentDeletePatientButton({ patientId, patientName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const msg = patientName
      ? `¿Eliminar definitivamente a ${patientName}? Esta acción no se puede deshacer y el registro se borrará por completo.`
      : "¿Eliminar definitivamente este paciente? Esta acción no se puede deshacer.";
    if (!confirm(msg)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/permanent`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error((data as { error?: string }).error || "No se pudo eliminar.");
        return;
      }

      toast.success("Paciente eliminado definitivamente.");
      router.push("/patients");
      router.refresh();
    } catch (error) {
      console.error("Error permanently deleting patient:", error);
      toast.error("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="destructive" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? "Eliminando…" : "Eliminar definitivamente"}
    </Button>
  );
}

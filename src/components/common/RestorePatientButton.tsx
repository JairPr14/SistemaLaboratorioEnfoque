"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  patientId: string;
};

export function RestorePatientButton({ patientId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!confirm("¿Restaurar este paciente? Volverá a aparecer en el listado activo.")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}`, { method: "PATCH" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error((errorData as { error?: string }).error || "No se pudo restaurar.");
        return;
      }

      toast.success("Paciente restaurado correctamente.");
      router.refresh();
    } catch (error) {
      console.error("Error restoring patient:", error);
      toast.error("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="default" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? "Restaurando…" : "Restaurar"}
    </Button>
  );
}

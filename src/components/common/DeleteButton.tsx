"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  url: string;
  label?: string;
};

export function DeleteButton({ url, label = "Eliminar" }: Props) {
  const router = useRouter();

  const handleClick = async () => {
    if (!confirm("¿Seguro que deseas eliminar este registro?")) return;

    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "No se pudo eliminar.");
        return;
      }

      toast.success("Registro eliminado.");
      router.refresh();
    } catch (error) {
      console.error("Error deleting record:", error);
      toast.error("Error de conexión. Intenta nuevamente.");
    }
  };

  return (
    <Button variant="destructive" size="sm" onClick={handleClick}>
      {label}
    </Button>
  );
}

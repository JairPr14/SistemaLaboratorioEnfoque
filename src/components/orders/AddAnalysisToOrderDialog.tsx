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
import { Search } from "lucide-react";

type TestItem = {
  id: string;
  code: string;
  name: string;
  section: string;
  price: number;
};

type Props = {
  orderId: string;
  existingLabTestIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddAnalysisToOrderDialog({
  orderId,
  existingLabTestIds,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedIds(new Set());
    setSearch("");
    fetch("/api/tests?active=true")
      .then((res) => res.json())
      .then((data) => setTests(data.items ?? []))
      .catch(() => {
        toast.error("Error al cargar el catálogo de análisis.");
        setTests([]);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const existingSet = new Set(existingLabTestIds);
  const availableTests = tests.filter((t) => !existingSet.has(t.id));
  const filteredTests = search.trim()
    ? availableTests.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.code.toLowerCase().includes(search.toLowerCase()) ||
          (t.section && t.section.toLowerCase().includes(search.toLowerCase())),
      )
    : availableTests;

  const toggleTest = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredTests.map((t) => t.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecciona al menos un análisis.");
      return;
    }
    const idsToAdd = Array.from(selectedIds).filter((id) => !existingSet.has(id));
    if (idsToAdd.length === 0) {
      toast.error("Esos análisis ya están en la orden.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labTestIds: idsToAdd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "No se pudieron añadir los análisis.");
        return;
      }
      toast.success(`Se añadieron ${data.added ?? selectedIds.size} análisis a la orden.`);
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
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Añadir análisis a la orden</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Selecciona uno o más análisis del catálogo para agregarlos a esta orden. Los que ya están en la orden no se muestran.
        </p>

        <div className="space-y-2">
          <Label className="text-xs text-slate-600">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Código, nombre o sección..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{filteredTests.length} análisis disponibles</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="hover:text-slate-900 hover:underline"
              >
                Seleccionar todos
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={clearSelection}
                className="hover:text-slate-900 hover:underline"
              >
                Limpiar
              </button>
            </div>
          </div>
          <div className="border border-slate-200 rounded-md overflow-auto max-h-[280px] bg-slate-50/50">
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Cargando análisis...
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                {availableTests.length === 0
                  ? "No hay más análisis disponibles para añadir."
                  : "No hay resultados para la búsqueda."}
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {filteredTests.map((test) => (
                  <li key={test.id}>
                    <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(test.id)}
                        onChange={() => toggleTest(test.id)}
                        className="rounded border-slate-300"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-900 text-sm">
                          {test.code} — {test.name}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">
                          {test.section}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-700 shrink-0">
                        S/ {Number(test.price).toFixed(2)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 pt-4 border-t border-slate-200 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || submitting}
          >
            {submitting ? "Añadiendo..." : `Añadir (${selectedIds.size})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

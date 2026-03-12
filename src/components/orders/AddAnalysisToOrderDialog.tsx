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
import { Search, Tag } from "lucide-react";

type TestItem = {
  id: string;
  code: string;
  name: string;
  section: string;
  price: number;
};

type ProfileItem = {
  id: string;
  name: string;
  packagePrice: number | null;
  tests: { id: string; code: string; name: string; section: string; price: number }[];
};

type Props = {
  orderId: string;
  existingLabTestIds: string[];
  /** IDs de promociones ya en la orden (para no mostrarlas como disponibles) */
  existingPromotionIds?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddAnalysisToOrderDialog({
  orderId,
  existingLabTestIds,
  existingPromotionIds = [],
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [tests, setTests] = useState<TestItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedTestIds(new Set());
    setSelectedProfileIds(new Set());
    setSearch("");
    fetch("/api/catalog/promociones-data")
      .then((res) => res.json())
      .then((data) => {
        const items = (data.items ?? []).map(
          (t: { section?: { code: string } | string | null }) => ({
            ...t,
            section:
              typeof t.section === "object" && t.section
                ? (t.section as { code: string }).code
                : (t.section ?? ""),
          }),
        );
        setTests(items);
        setProfiles(data.profiles ?? []);
      })
      .catch(() => {
        toast.error("Error al cargar catálogo y promociones.");
        setTests([]);
        setProfiles([]);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const existingTestSet = new Set(existingLabTestIds);
  const existingProfileSet = new Set(existingPromotionIds);

  const testIdsInSelectedProfiles = new Set(
    profiles
      .filter((p) => selectedProfileIds.has(p.id))
      .flatMap((p) => p.tests.map((t) => t.id)),
  );

  const availableProfiles = profiles.filter((p) => !existingProfileSet.has(p.id));
  const availableTests = tests.filter((t) => !existingTestSet.has(t.id));
  const filteredTests = search.trim()
    ? availableTests.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.code.toLowerCase().includes(search.toLowerCase()) ||
          (t.section && t.section.toLowerCase().includes(search.toLowerCase())),
      )
    : availableTests;

  const toggleTest = (id: string) => {
    if (testIdsInSelectedProfiles.has(id)) return;
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addProfile = (id: string) => {
    if (existingProfileSet.has(id)) return;
    setSelectedProfileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) return prev;
      next.add(id);
      return next;
    });
  };

  const removeProfile = (id: string) => {
    setSelectedProfileIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const selectAllTests = () => {
    const addable = filteredTests
      .filter((t) => !testIdsInSelectedProfiles.has(t.id))
      .map((t) => t.id);
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      addable.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedTestIds(new Set());
    setSelectedProfileIds(new Set());
  };

  const handleSubmit = async () => {
    const profileIdsToAdd = Array.from(selectedProfileIds).filter(
      (id) => !existingProfileSet.has(id),
    );
    const testIdsToAdd = Array.from(selectedTestIds)
      .filter((id) => !existingTestSet.has(id) && !testIdsInSelectedProfiles.has(id));

    if (profileIdsToAdd.length === 0 && testIdsToAdd.length === 0) {
      toast.error("Selecciona al menos un análisis o una promoción.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labTestIds: testIdsToAdd,
          profileIds: profileIdsToAdd,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "No se pudieron añadir los análisis.");
        return;
      }
      const added = data.added ?? testIdsToAdd.length + (data.addedFromProfiles ?? 0);
      toast.success(`Se añadieron ${added} análisis a la orden.`);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Error de conexión.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalSelected =
    selectedTestIds.size +
    profiles
      .filter((p) => selectedProfileIds.has(p.id))
      .reduce((acc, p) => acc + p.tests.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Añadir análisis a la orden</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Selecciona análisis sueltos y/o promociones para agregar. Los que ya están en la orden no se muestran.
        </p>

        {/* Sección Promociones */}
        {availableProfiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-slate-600 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Promociones
            </Label>
            <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-700 dark:bg-slate-800/30">
              <select
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) {
                    addProfile(id);
                    e.target.value = "";
                  }
                }}
                disabled={loading}
              >
                <option value="">+ Agregar promoción</option>
                {availableProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.packagePrice != null ? ` — S/ ${p.packagePrice.toFixed(2)}` : ""}
                    {` (${p.tests.length} análisis)`}
                  </option>
                ))}
              </select>
              {profiles
                .filter((p) => selectedProfileIds.has(p.id))
                .map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                  >
                    {p.name}
                    <button
                      type="button"
                      onClick={() => removeProfile(p.id)}
                      className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-100"
                      title="Quitar"
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Buscar análisis */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-600">Buscar análisis</Label>
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
                onClick={selectAllTests}
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
          <div className="border border-slate-200 rounded-md overflow-auto max-h-[240px] bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/30">
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Cargando catálogo...
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                {availableTests.length === 0
                  ? "No hay más análisis disponibles para añadir."
                  : "No hay resultados para la búsqueda."}
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredTests.map((test) => {
                  const inSelectedProfile = testIdsInSelectedProfiles.has(test.id);
                  return (
                    <li key={test.id}>
                      <label
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 ${
                          inSelectedProfile ? "opacity-60 cursor-default" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTestIds.has(test.id) || inSelectedProfile}
                          disabled={inSelectedProfile}
                          onChange={() => toggleTest(test.id)}
                          className="rounded border-slate-300"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            {test.code} — {test.name}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">
                            {test.section}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
                          S/ {Number(test.price).toFixed(2)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
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
            disabled={totalSelected === 0 || submitting}
          >
            {submitting ? "Añadiendo..." : `Añadir (${totalSelected})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

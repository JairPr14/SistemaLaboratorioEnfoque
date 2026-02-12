"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Star, X } from "lucide-react";

type PatientResult = { id: string; label: string; sublabel: string };
type TestItem = { id: string; code: string; name: string; section: string; price: number };
type Profile = { id: string; name: string; packagePrice: number | null; tests: TestItem[] };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QuickOrderModal({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; label: string } | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [patientDraft, setPatientDraft] = useState({
    firstName: "",
    lastName: "",
    dni: "",
    sex: "M" as "M" | "F" | "O",
    birthDate: "",
  });
  const [tests, setTests] = useState<TestItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set());
  const [doctorName, setDoctorName] = useState("");
  const [indication, setIndication] = useState("");
  const [patientType, setPatientType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchTests = useCallback(async () => {
    const res = await fetch("/api/tests?active=true");
    const data = await res.json();
    setTests(data.items ?? []);
  }, []);

  const fetchProfiles = useCallback(async () => {
    const res = await fetch("/api/test-profiles");
    const data = await res.json();
    setProfiles(data.profiles ?? []);
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch("/api/favorites/tests");
      const data = await res.json();
      setFavoriteIds(new Set(data.testIds ?? []));
    } catch {
      setFavoriteIds(new Set());
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTests();
      fetchProfiles();
      fetchFavorites();
    }
  }, [open, fetchTests, fetchProfiles, fetchFavorites]);

  useEffect(() => {
    if (!patientQuery || patientQuery.length < 2) {
      setPatientResults([]);
      return;
    }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(patientQuery)}`);
        const data = await res.json();
        const patients = (data.patients ?? []).map((p: { id: string; label: string; sublabel: string }) => ({
          id: p.id,
          label: p.label,
          sublabel: p.sublabel,
        }));
        setPatientResults(patients);
      } catch {
        setPatientResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [patientQuery]);

  const toggleTest = (id: string) => {
    if (testIdsInPromos.has(id)) {
      const promoContaining = profiles.find(
        (p) => selectedProfileIds.has(p.id) && p.tests.some((x) => x.id === id)
      );
      toast.info(
        `Este análisis ya está incluido en la promoción "${promoContaining?.name ?? ""}". No se puede seleccionar individualmente.`
      );
      return;
    }
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addProfile = (profile: Profile) => {
    if (selectedProfileIds.has(profile.id)) {
      toast.info("Esta promoción ya está seleccionada.");
      return;
    }
    setSelectedProfileIds((prev) => new Set(prev).add(profile.id));
    const profileTestIds = new Set(profile.tests.map((t) => t.id));
    setSelectedTestIds((prev) => {
      const previousCount = prev.size;
      const next = new Set(prev);
      const removedIds: string[] = [];
      profileTestIds.forEach((id) => {
        if (next.has(id)) {
          removedIds.push(id);
          next.delete(id);
        }
      });
      
      // Si se eliminaron análisis individuales porque ahora están en la promoción, mostrar mensaje
      if (removedIds.length > 0) {
        setTimeout(() => {
          toast.info(
            `Se agregó la promoción "${profile.name}". ${removedIds.length} análisis individual${removedIds.length > 1 ? "es" : ""} que ya estaban incluidos fueron removidos para evitar duplicados.`
          );
        }, 100);
      }
      
      return next;
    });
  };

  const removeProfile = (profileId: string) => {
    setSelectedProfileIds((prev) => {
      const next = new Set(prev);
      next.delete(profileId);
      return next;
    });
  };

  const testIdsInPromos = new Set(
    Array.from(selectedProfileIds).flatMap((pid) => {
      const p = profiles.find((x) => x.id === pid);
      return p ? p.tests.map((t) => t.id) : [];
    })
  );

  const toggleFavorite = async (testId: string) => {
    const add = !favoriteIds.has(testId);
    try {
      const res = await fetch("/api/favorites/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, add }),
      });
      if (res.ok) fetchFavorites();
    } catch {
      toast.error("No se pudo actualizar favorito");
    }
  };

  const handleSubmit = async () => {
    const testsFromProfiles = new Set(
      Array.from(selectedProfileIds).flatMap((pid) => {
        const p = profiles.find((x) => x.id === pid);
        return p ? p.tests.map((t) => t.id) : [];
      })
    );
    const individualTestIds = Array.from(selectedTestIds).filter((id) => !testsFromProfiles.has(id));
    const hasTests = selectedProfileIds.size > 0 || individualTestIds.length > 0;
    if (!hasTests) {
      toast.error("Selecciona al menos un análisis o una promoción");
      return;
    }

    let patientId: string | undefined;
    let patientDraftPayload: typeof patientDraft | undefined;

    if (selectedPatient) {
      patientId = selectedPatient.id;
    } else if (showNewPatient && patientDraft.firstName && patientDraft.lastName && patientDraft.dni && patientDraft.birthDate) {
      patientDraftPayload = {
        ...patientDraft,
        birthDate: patientDraft.birthDate,
      };
    } else {
      toast.error("Selecciona o crea un paciente");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          patientDraft: patientDraftPayload,
          doctorName: doctorName || null,
          indication: indication || null,
          patientType: patientType || null,
          profileIds: Array.from(selectedProfileIds),
          tests: individualTestIds,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Error al crear la orden");
        return;
      }

      toast.success("Orden creada correctamente", {
        action: {
          label: "Ir a captura",
          onClick: () => {
            router.push(`/orders/${data.orderId}`);
            onOpenChange(false);
          },
        },
      });
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  const favoriteTests = tests.filter((t) => favoriteIds.has(t.id));
  const selectedProfiles = profiles.filter((p) => selectedProfileIds.has(p.id));
  const testsFromProfilesSet = new Set(
    selectedProfiles.flatMap((p) => p.tests.map((t) => t.id))
  );
  const selectedIndividualTests = tests.filter(
    (t) => selectedTestIds.has(t.id) && !testsFromProfilesSet.has(t.id)
  );
  const totalFromProfiles = selectedProfiles.reduce(
    (acc, p) => acc + (p.packagePrice ?? p.tests.reduce((s, t) => s + t.price, 0)),
    0
  );
  const totalFromTests = selectedIndividualTests.reduce((acc, t) => acc + t.price, 0);
  const total = totalFromProfiles + totalFromTests;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Orden rápida</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Paciente */}
          <div className="space-y-2">
            <Label>Paciente</Label>
            {selectedPatient && !showNewPatient ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
                <span className="text-sm font-medium">{selectedPatient.label}</span>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : showNewPatient ? (
              <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-600">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Nombre"
                    value={patientDraft.firstName}
                    onChange={(e) => setPatientDraft((p) => ({ ...p, firstName: e.target.value }))}
                  />
                  <Input
                    placeholder="Apellido"
                    value={patientDraft.lastName}
                    onChange={(e) => setPatientDraft((p) => ({ ...p, lastName: e.target.value }))}
                  />
                  <Input
                    placeholder="DNI"
                    value={patientDraft.dni}
                    onChange={(e) => setPatientDraft((p) => ({ ...p, dni: e.target.value }))}
                  />
                  <Input
                    type="date"
                    placeholder="Fecha nac."
                    value={patientDraft.birthDate}
                    onChange={(e) => setPatientDraft((p) => ({ ...p, birthDate: e.target.value }))}
                  />
                  <select
                    value={patientDraft.sex}
                    onChange={(e) =>
                      setPatientDraft((p) => ({ ...p, sex: e.target.value as "M" | "F" | "O" }))
                    }
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewPatient(false)}
                  className="text-sm text-slate-600 hover:underline dark:text-slate-400"
                >
                  Cancelar · Buscar paciente existente
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar por DNI o nombre..."
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {patientQuery.length >= 2 && (
                  <ul className="max-h-40 overflow-auto rounded border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800">
                    {searchLoading ? (
                      <li className="px-4 py-3 text-sm text-slate-500">Buscando...</li>
                    ) : patientResults.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-slate-500">Sin resultados</li>
                    ) : (
                      patientResults.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPatient({ id: p.id, label: p.label });
                              setPatientQuery("");
                              setPatientResults([]);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            {p.label} · {p.sublabel}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => setShowNewPatient(true)}
                  className="text-sm text-slate-600 hover:underline dark:text-slate-400"
                >
                  Crear paciente rápido
                </button>
              </div>
            )}
          </div>

          {/* Médico e indicación */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Médico (opcional)</Label>
              <Input
                placeholder="Dr. García"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Indicación (opcional)</Label>
              <Input
                placeholder="Control"
                value={indication}
                onChange={(e) => setIndication(e.target.value)}
              />
            </div>
          </div>

          {/* Análisis */}
          <div className="space-y-2">
            <Label>Análisis</Label>
            {profiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Agregar promoción:</span>
                <select
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) {
                      const p = profiles.find((x) => x.id === id);
                      if (p) addProfile(p);
                      e.target.value = "";
                    }
                  }}
                  className="h-8 rounded border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="">Seleccionar paquete</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.packagePrice != null ? ` — S/ ${p.packagePrice.toFixed(2)}` : ""}
                      {" "}({p.tests.length} análisis)
                    </option>
                  ))}
                </select>
                {selectedProfiles.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200"
                  >
                    {p.name}
                    <button
                      type="button"
                      onClick={() => removeProfile(p.id)}
                      className="text-amber-600 hover:text-amber-800"
                      title="Quitar"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {favoriteTests.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> Favoritos
                </p>
                <div className="flex flex-wrap gap-1">
                  {favoriteTests.map((t) => (
                    <Badge
                      key={t.id}
                      variant={selectedTestIds.has(t.id) ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleTest(t.id)}
                    >
                      {t.code} - {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                Lista general
              </p>
              <div className="max-h-44 overflow-auto rounded border border-slate-200 p-2 dark:border-slate-600">
                {tests.map((t) => {
                  const isInPromo = testIdsInPromos.has(t.id);
                  const promoContaining = profiles.find(
                    (p) => selectedProfileIds.has(p.id) && p.tests.some((x) => x.id === t.id)
                  );
                  const isChecked = selectedTestIds.has(t.id) || isInPromo;
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm ${
                        isInPromo ? "bg-amber-50/50 dark:bg-amber-900/10" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                      } ${selectedTestIds.has(t.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isInPromo}
                          onChange={() => toggleTest(t.id)}
                          title={isInPromo ? `Incluido en: ${promoContaining?.name ?? ""}` : undefined}
                        />
                        <span className="truncate">
                          {t.code} - {t.name}
                          {isInPromo && promoContaining && (
                            <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                              (en {promoContaining.name})
                            </span>
                          )}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(t.id);
                        }}
                        className="text-slate-400 hover:text-amber-500 shrink-0"
                      >
                        <Star
                          className={`h-4 w-4 ${favoriteIds.has(t.id) ? "fill-amber-400 text-amber-500" : ""}`}
                        />
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>
            {(selectedProfiles.length > 0 || selectedIndividualTests.length > 0) && (
              <div className="rounded border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/50 space-y-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Resumen (promociones encapsuladas, análisis sueltos aparte)
                </p>
                {selectedProfiles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Promociones</p>
                    {selectedProfiles.map((p) => (
                      <div
                        key={p.id}
                        className="text-xs rounded bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 border border-amber-200 dark:border-amber-800"
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-slate-600 dark:text-slate-400"> — {p.tests.map((x) => x.code).join(", ")}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedIndividualTests.length > 0 && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Análisis sueltos: {selectedIndividualTests.map((t) => t.code).join(", ")}
                  </p>
                )}
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-600">
                  Total: S/ {total.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creando..." : "Crear orden"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

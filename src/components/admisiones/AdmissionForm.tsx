"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  Stethoscope,
  FlaskConical,
  Tag,
  DollarSign,
  Building2,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PatientOption = {
  id: string;
  label: string;
  dni: string;
  firstName: string;
  lastName: string;
};

type TestOption = {
  id: string;
  code: string;
  name: string;
  sectionLabel: string;
  price: number;
};

type ProfileOption = {
  id: string;
  name: string;
  packagePrice: number | null;
  tests: { id: string; code: string; name: string; price: number }[];
};

type BranchOption = {
  id: string;
  name: string;
};

type Props = {
  patients: PatientOption[];
  tests: TestOption[];
  profiles: ProfileOption[];
  branches: BranchOption[];
  canAdjustPrice: boolean;
};

type DraftPatient = {
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string;
  sex: "M" | "F" | "O";
};

export function AdmissionForm({
  patients,
  tests,
  profiles,
  branches,
  canAdjustPrice,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const [draftPatient, setDraftPatient] = useState<DraftPatient>({
    firstName: "",
    lastName: "",
    dni: "",
    birthDate: "",
    sex: "M",
  });

  const [requestedBy, setRequestedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [patientType, setPatientType] = useState<"" | "CLINICA" | "EXTERNO" | "IZAGA">("");
  const [branchId, setBranchId] = useState("");
  const [testSearch, setTestSearch] = useState("");

  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [priceAdjustments, setPriceAdjustments] = useState<
    Record<string, { priceApplied: string; reason: string }>
  >({});

  const selectedProfiles = useMemo(
    () => profiles.filter((p) => selectedProfileIds.includes(p.id)),
    [profiles, selectedProfileIds],
  );

  const testIdsFromProfiles = useMemo(() => {
    return new Set(selectedProfiles.flatMap((profile) => profile.tests.map((t) => t.id)));
  }, [selectedProfiles]);

  const filteredPatients = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    if (!term) return [];
    return patients
      .filter(
        (p) =>
          p.dni.toLowerCase().includes(term) ||
          p.firstName.toLowerCase().includes(term) ||
          p.lastName.toLowerCase().includes(term) ||
          p.label.toLowerCase().includes(term),
      )
      .slice(0, 12);
  }, [patients, patientSearch]);

  const filteredTestsBySection = useMemo(() => {
    const term = testSearch.trim().toLowerCase();
    const filtered = term
      ? tests.filter(
          (t) =>
            t.name.toLowerCase().includes(term) ||
            t.code.toLowerCase().includes(term) ||
            t.sectionLabel.toLowerCase().includes(term),
        )
      : tests;
    const groups = new Map<string, TestOption[]>();
    for (const test of filtered) {
      if (!groups.has(test.sectionLabel)) groups.set(test.sectionLabel, []);
      groups.get(test.sectionLabel)!.push(test);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tests, testSearch]);

  const selectedItemsForPricing = useMemo(() => {
    const profileItems = selectedProfiles.flatMap((profile) => {
      const each =
        profile.packagePrice != null && profile.tests.length > 0
          ? profile.packagePrice / profile.tests.length
          : null;
      return profile.tests.map((test) => ({
        testId: test.id,
        code: test.code,
        name: test.name,
        priceBase: each ?? test.price,
        source: `Promoción: ${profile.name}`,
      }));
    });
    const individualItems = selectedTestIds
      .filter((id) => !testIdsFromProfiles.has(id))
      .map((id) => tests.find((t) => t.id === id))
      .filter(Boolean)
      .map((test) => ({
        testId: test!.id,
        code: test!.code,
        name: test!.name,
        priceBase: test!.price,
        source: "Individual",
      }));

    const merged = [...profileItems, ...individualItems];
    return merged.map((item) => {
      const adjustment = priceAdjustments[item.testId];
      const parsedApplied = adjustment?.priceApplied ? Number(adjustment.priceApplied) : item.priceBase;
      const priceApplied = Number.isFinite(parsedApplied) ? parsedApplied : item.priceBase;
      return {
        ...item,
        priceApplied,
        reason: adjustment?.reason ?? "",
      };
    });
  }, [priceAdjustments, selectedProfiles, selectedTestIds, testIdsFromProfiles, tests]);

  const total = useMemo(
    () => selectedItemsForPricing.reduce((acc, item) => acc + item.priceApplied, 0),
    [selectedItemsForPricing],
  );

  function toggleTest(testId: string) {
    setSelectedTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId],
    );
  }

  function addProfile(profileId: string) {
    if (!profileId) return;
    if (selectedProfileIds.includes(profileId)) return;
    setSelectedProfileIds((prev) => [...prev, profileId]);
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    const profileTestIds = new Set(profile.tests.map((t) => t.id));
    setSelectedTestIds((prev) => prev.filter((id) => !profileTestIds.has(id)));
  }

  function removeProfile(profileId: string) {
    setSelectedProfileIds((prev) => prev.filter((id) => id !== profileId));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (patientMode === "existing" && !selectedPatientId) {
      toast.error("Selecciona un paciente existente o cambia a registro rápido.");
      return;
    }
    if (patientMode === "new") {
      if (!draftPatient.firstName || !draftPatient.lastName || !draftPatient.dni || !draftPatient.birthDate) {
        toast.error("Completa los datos obligatorios del paciente nuevo.");
        return;
      }
    }
    if (selectedItemsForPricing.length === 0) {
      toast.error("Selecciona al menos un análisis o promoción.");
      return;
    }

    const itemAdjustments = selectedItemsForPricing
      .filter((item) => Math.abs(item.priceApplied - item.priceBase) > 0.0001 || item.reason.trim().length > 0)
      .map((item) => ({
        testId: item.testId,
        priceApplied: item.priceApplied,
        adjustmentReason: item.reason.trim() || null,
      }));

    setSaving(true);
    try {
      const payload = {
        patientId: patientMode === "existing" ? selectedPatientId : undefined,
        patientDraft:
          patientMode === "new"
            ? {
                firstName: draftPatient.firstName.trim(),
                lastName: draftPatient.lastName.trim(),
                dni: draftPatient.dni.trim(),
                birthDate: draftPatient.birthDate,
                sex: draftPatient.sex,
              }
            : undefined,
        requestedBy: requestedBy.trim() || null,
        notes: notes.trim() || null,
        patientType: patientType || null,
        branchId: branchId || null,
        tests: selectedTestIds,
        profileIds: selectedProfileIds,
        itemAdjustments,
      };

      const res = await fetch("/api/admisiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo crear la pre-orden.");
        return;
      }

      toast.success("Pre-orden de admisión creada correctamente.");
      router.push("/admisiones");
      router.refresh();
    } catch {
      toast.error("Error de conexión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="divide-y divide-slate-100 dark:divide-slate-800">
      {/* Paciente y datos generales */}
      <section className="p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
            <UserPlus className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Paciente y datos generales</h2>
        </div>

        <div className="space-y-5">
          <div>
            <Label className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">Modo paciente</Label>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50/80 p-1 dark:border-slate-700 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setPatientMode("existing")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  patientMode === "existing"
                    ? "bg-white text-teal-600 shadow-sm dark:bg-slate-800 dark:text-teal-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Search className="mr-1.5 inline-block h-3.5 w-3.5" />
                Existente
              </button>
              <button
                type="button"
                onClick={() => setPatientMode("new")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  patientMode === "new"
                    ? "bg-white text-teal-600 shadow-sm dark:bg-slate-800 dark:text-teal-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <UserPlus className="mr-1.5 inline-block h-3.5 w-3.5" />
                Nuevo
              </button>
            </div>
          </div>

          {patientMode === "existing" ? (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Buscar paciente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="DNI, nombres o apellidos..."
                  className="pl-9"
                />
              </div>
              {patientSearch.trim() && (
                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
                  {filteredPatients.length === 0 ? (
                    <p className="p-4 text-center text-sm text-slate-500">Sin resultados</p>
                  ) : (
                    filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(patient.id);
                          setPatientSearch("");
                        }}
                        className="block w-full border-b border-slate-100 px-4 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-teal-50/80 dark:border-slate-800 dark:hover:bg-teal-900/20"
                      >
                        {patient.label}
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedPatientId && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {patients.find((p) => p.id === selectedPatientId)?.label}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nombres</Label>
                <Input
                  className="mt-1"
                  value={draftPatient.firstName}
                  onChange={(e) => setDraftPatient((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Ej: Juan Carlos"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Apellidos</Label>
                <Input
                  className="mt-1"
                  value={draftPatient.lastName}
                  onChange={(e) => setDraftPatient((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Ej: García López"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">DNI</Label>
                <Input
                  className="mt-1"
                  value={draftPatient.dni}
                  onChange={(e) => setDraftPatient((prev) => ({ ...prev, dni: e.target.value }))}
                  placeholder="8 dígitos"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Fecha de nacimiento</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={draftPatient.birthDate}
                  onChange={(e) => setDraftPatient((prev) => ({ ...prev, birthDate: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Sexo</Label>
                <select
                  value={draftPatient.sex}
                  onChange={(e) => setDraftPatient((prev) => ({ ...prev, sex: e.target.value as "M" | "F" | "O" }))}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                <Stethoscope className="mr-1 inline-block h-3.5 w-3.5" />
                Médico solicitante
              </Label>
              <Input
                className="mt-1"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tipo de paciente</Label>
              <select
                value={patientType}
                onChange={(e) => setPatientType(e.target.value as any)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Sin especificar</option>
                <option value="CLINICA">Clínica</option>
                <option value="EXTERNO">Externo</option>
                <option value="IZAGA">Izaga</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                <Building2 className="mr-1 inline-block h-3.5 w-3.5" />
                Sede
              </Label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Sin sede</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                <FileText className="mr-1 inline-block h-3.5 w-3.5" />
                Notas
              </Label>
              <Input
                className="mt-1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Análisis a solicitar */}
      <section className="p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400">
            <FlaskConical className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Análisis a solicitar</h2>
        </div>

        {profiles.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <Tag className="h-4 w-4 text-slate-500" />
            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              onChange={(e) => {
                if (e.target.value) {
                  addProfile(e.target.value);
                  e.target.value = "";
                }
              }}
            >
              <option value="">+ Agregar promoción</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                  {profile.packagePrice != null ? ` · S/ ${profile.packagePrice.toFixed(2)}` : ""}
                </option>
              ))}
            </select>
            {selectedProfiles.map((profile) => (
              <span
                key={profile.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
              >
                {profile.name}
                <button
                  type="button"
                  onClick={() => removeProfile(profile.id)}
                  className="rounded-full p-0.5 hover:bg-teal-200 dark:hover:bg-teal-800"
                  aria-label="Quitar"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={testSearch}
            onChange={(e) => setTestSearch(e.target.value)}
            placeholder="Buscar por código, nombre o sección..."
            className="pl-9"
          />
        </div>

        <div className="max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-inner dark:border-slate-700 dark:bg-slate-900/30">
          {filteredTestsBySection.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">Sin análisis disponibles</p>
          ) : (
            filteredTestsBySection.map(([section, sectionTests]) => (
              <div key={section} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <div className="sticky top-0 z-10 bg-teal-50/90 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  {section}
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {sectionTests.map((test) => {
                    const inProfile = testIdsFromProfiles.has(test.id);
                    const checked = selectedTestIds.includes(test.id) || inProfile;
                    return (
                      <label
                        key={test.id}
                        className={`flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors ${
                          inProfile
                            ? "bg-amber-50/70 dark:bg-amber-950/25"
                            : "hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                        } ${checked ? "bg-teal-50/50 dark:bg-teal-900/20" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={inProfile}
                          className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          onChange={() => toggleTest(test.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-slate-900 dark:text-slate-100">
                            {test.name}
                          </span>
                          <span className="text-xs text-slate-500">{test.code}</span>
                        </span>
                        <span className="shrink-0 font-semibold text-slate-700 dark:text-slate-200">
                          S/ {test.price.toFixed(2)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Precios */}
      <section className="p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
            <DollarSign className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Precios de la solicitud</h2>
        </div>
        {selectedItemsForPricing.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
            Selecciona análisis arriba para ver el resumen
          </p>
        ) : (
          <div className="space-y-3">
            {selectedItemsForPricing.map((item) => (
              <div
                key={`${item.source}-${item.testId}`}
                className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:grid-cols-12 dark:border-slate-700 dark:bg-slate-800/30"
              >
                <div className="sm:col-span-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.code}</p>
                  <p className="text-xs text-slate-500">{item.name}</p>
                </div>
                <div className="sm:col-span-2 text-sm text-slate-600 dark:text-slate-400">
                  Base: S/ {item.priceBase.toFixed(2)}
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!canAdjustPrice}
                    className="h-9"
                    value={priceAdjustments[item.testId]?.priceApplied ?? item.priceBase.toFixed(2)}
                    onChange={(e) =>
                      setPriceAdjustments((prev) => ({
                        ...prev,
                        [item.testId]: {
                          priceApplied: e.target.value,
                          reason: prev[item.testId]?.reason ?? "",
                        },
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-4">
                  <Input
                    placeholder="Motivo de ajuste (opcional)"
                    disabled={!canAdjustPrice}
                    className="h-9"
                    value={priceAdjustments[item.testId]?.reason ?? ""}
                    onChange={(e) =>
                      setPriceAdjustments((prev) => ({
                        ...prev,
                        [item.testId]: {
                          priceApplied: prev[item.testId]?.priceApplied ?? item.priceBase.toFixed(2),
                          reason: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <p className="sm:col-span-12 text-xs text-slate-500">{item.source}</p>
              </div>
            ))}
          </div>
        )}
        {!canAdjustPrice && selectedItemsForPricing.length > 0 && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            Sin permiso para ajustar precios. Se aplicará el precio base.
          </p>
        )}
      </section>

      {/* Footer */}
      <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/30 sm:px-8">
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">Total estimado:</span>
          <span className="text-xl font-bold text-teal-600 dark:text-teal-400">S/ {total.toFixed(2)}</span>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admisiones")}
            className="min-w-[100px]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving || selectedItemsForPricing.length === 0}
            className="min-w-[140px] bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500"
          >
            {saving ? "Guardando..." : "Guardar pre-orden"}
          </Button>
        </div>
      </div>
    </form>
  );
}

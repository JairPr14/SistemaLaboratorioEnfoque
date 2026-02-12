"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { orderCreateSchema } from "@/features/lab/schemas";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrderFormValues = z.infer<typeof orderCreateSchema>;

type PatientOption = {
  id: string;
  label: string;
  dni: string;
  firstName: string;
  lastName: string;
};

type TestOption = {
  id: string;
  label: string;
  code: string;
  name: string;
  section: string;
  sectionLabel: string;
  price: number;
  hasTemplate?: boolean;
  templateTitle?: string | null;
};

type ProfileOption = {
  id: string;
  name: string;
  packagePrice: number | null;
  tests: { id: string; code: string; name: string; section: string; price: number }[];
};

type Props = {
  patients: PatientOption[];
  recentPatients?: PatientOption[];
  tests: TestOption[];
  profiles?: ProfileOption[];
};

export function OrderForm({ patients, recentPatients = [], tests, profiles = [] }: Props) {
  const router = useRouter();
  const [patientSearch, setPatientSearch] = useState("");
  const [testSearch, setTestSearch] = useState("");

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderCreateSchema) as Resolver<OrderFormValues>,
    defaultValues: {
      patientId: "",
      requestedBy: "",
      notes: "",
      orderDate: new Date().toISOString().slice(0, 10),
      patientType: null,
      labTestIds: [],
      profileIds: [],
    },
  });

  const selectedPatientId = form.watch("patientId");
  const selectedPatient = selectedPatientId
    ? patients.find((p) => p.id === selectedPatientId)
    : null;

  const filteredPatients = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    if (!term) return [];
    return patients.filter(
      (p) =>
        p.dni.toLowerCase().includes(term) ||
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term) ||
        p.label.toLowerCase().includes(term),
    );
  }, [patients, patientSearch]);

  const filteredTestsBySection = useMemo(() => {
    const term = testSearch.trim().toLowerCase();
    const filtered = term
      ? tests.filter(
          (t) =>
            t.label.toLowerCase().includes(term) ||
            t.code.toLowerCase().includes(term) ||
            t.name.toLowerCase().includes(term) ||
            t.sectionLabel.toLowerCase().includes(term),
        )
      : tests;

    const bySection = new Map<string, TestOption[]>();
    for (const t of filtered) {
      const key = t.sectionLabel;
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key)!.push(t);
    }
    return Array.from(bySection.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [tests, testSearch]);

  const handleSelectPatient = (patient: PatientOption) => {
    form.setValue("patientId", patient.id, { shouldValidate: true });
    setPatientSearch("");
  };

  const handleClearPatient = () => {
    form.setValue("patientId", "");
    setPatientSearch("");
  };

  const testIdsInPromos = useMemo(
    () =>
      new Set(
        (form.watch("profileIds") ?? [])
          .flatMap((pid) => profiles.find((p) => p.id === pid)?.tests.map((t) => t.id) ?? [])
      ),
    [profiles, form.watch("profileIds")]
  );

  const getProfileContainingTest = (testId: string) =>
    profiles.find((p) => selectedProfileIds.includes(p.id) && p.tests.some((t) => t.id === testId));

  const toggleTest = (testId: string) => {
    const current = new Set(form.getValues("labTestIds"));
    if (current.has(testId)) {
      current.delete(testId);
      form.setValue("labTestIds", Array.from(current), { shouldValidate: true });
    } else {
      if (testIdsInPromos.has(testId)) {
        toast.info("Este análisis ya está incluido en una promoción seleccionada.");
        return;
      }
      current.add(testId);
      form.setValue("labTestIds", Array.from(current), { shouldValidate: true });
    }
  };

  const addProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    const currentProfiles = new Set(form.getValues("profileIds"));
    if (currentProfiles.has(profileId)) return;
    currentProfiles.add(profileId);
    const profileTestIds = new Set(profile.tests.map((t) => t.id));
    const labIds = form.getValues("labTestIds").filter((id) => !profileTestIds.has(id));
    form.setValue("profileIds", Array.from(currentProfiles), { shouldValidate: true });
    form.setValue("labTestIds", labIds, { shouldValidate: true });
  };

  const removeProfile = (profileId: string) => {
    const current = form.getValues("profileIds").filter((id) => id !== profileId);
    form.setValue("profileIds", current, { shouldValidate: true });
  };

  const onSubmit = async (values: OrderFormValues) => {
    try {
      const profileIds = values.profileIds ?? [];
      const testIdsInSelectedPromos = new Set(
        profileIds.flatMap(
          (pid) => profiles.find((p) => p.id === pid)?.tests.map((t) => t.id) ?? []
        )
      );
      const labTestIdsOnlyExternal = (values.labTestIds ?? []).filter(
        (id) => !testIdsInSelectedPromos.has(id)
      );
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          labTestIds: labTestIdsOnlyExternal,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "No se pudo crear la orden.");
        return;
      }

      toast.success("Orden creada correctamente.");
      router.push("/orders");
      router.refresh();
    } catch (error) {
      console.error("Error submitting order form:", error);
      toast.error("Error de conexión. Intenta nuevamente.");
    }
  };

  const selectedIds = new Set(form.watch("labTestIds"));
  const selectedProfileIds = form.watch("profileIds") ?? [];
  const selectedProfiles = profiles.filter((p) => selectedProfileIds.includes(p.id));
  const selectedIndividualTests = tests.filter(
    (t) => selectedIds.has(t.id) && !testIdsInPromos.has(t.id)
  );
  const totalFromProfiles = selectedProfiles.reduce((acc, p) => {
    return acc + (p.packagePrice ?? p.tests.reduce((s, t) => s + t.price, 0));
  }, 0);
  const totalFromTests = selectedIndividualTests.reduce((acc, t) => acc + t.price, 0);
  const total = totalFromProfiles + totalFromTests;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Paciente y datos de solicitud */}
      <section className="space-y-5 rounded-xl border border-slate-200/80 bg-slate-50/30 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-700">
          Paciente y solicitud
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 min-w-0">
            <Label className="text-slate-700">Paciente</Label>
            {selectedPatient ? (
              <div className="flex items-center gap-2 sm:gap-3 rounded-lg border border-slate-200 bg-white px-3 sm:px-4 py-3 shadow-sm min-w-0">
                <span className="flex-1 text-sm font-medium text-slate-900 truncate min-w-0">
                  {selectedPatient.label}
                </span>
                <button
                  type="button"
                  onClick={handleClearPatient}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPatients.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      Últimos 3 registrados
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recentPatients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPatient(p)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 min-w-0 max-w-full sm:max-w-none"
                        >
                          <span className="font-medium text-slate-900 block truncate">{p.label}</span>
                          <span className="text-slate-500 text-xs">DNI {p.dni}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Buscar por DNI o nombre..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    autoComplete="off"
                    className="rounded-lg border-slate-200 pr-9"
                  />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
                  🔍
                </span>
                {patientSearch.trim() && (
                  <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg max-h-52 overflow-y-auto">
                    {filteredPatients.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-slate-500">
                        Sin coincidencias. Pruebe DNI, nombre o apellido.
                      </li>
                    ) : (
                      filteredPatients.map((patient) => (
                        <li key={patient.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectPatient(patient)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                          >
                            <span className="font-medium text-slate-900">
                              {patient.label}
                            </span>
                            <span className="ml-2 text-slate-500">
                              DNI {patient.dni}
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">Fecha de la orden</Label>
            <Input
              type="date"
              {...form.register("orderDate")}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">Tipo de paciente (sede)</Label>
            <select
              {...form.register("patientType")}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Sin especificar</option>
              <option value="CLINICA">Paciente Clínica</option>
              <option value="EXTERNO">Paciente Externo</option>
              <option value="IZAGA">Paciente Izaga</option>
            </select>
            <p className="text-xs text-slate-500">Solo para reportes; no se muestra en PDF.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">Médico solicitante</Label>
            <Input
              {...form.register("requestedBy")}
              placeholder="Ej: Dr. García"
              className="rounded-lg"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">Notas (opcional)</Label>
          <Input
            {...form.register("notes")}
            placeholder="Indicaciones o observaciones"
            className="rounded-lg"
          />
        </div>
      </section>

      {/* Análisis */}
      <section className="space-y-4 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Análisis a solicitar
          </h2>
          {(selectedIndividualTests.length > 0 || selectedProfiles.length > 0) && (
            <p className="text-sm text-slate-500">
              {selectedProfiles.length > 0 && (
                <span className="font-medium text-slate-700">
                  {selectedProfiles.length} promoción(es)
                </span>
              )}
              {selectedProfiles.length > 0 && selectedIndividualTests.length > 0 && " · "}
              {selectedIndividualTests.length > 0 && (
                <span className="font-medium text-slate-700">
                  {selectedIndividualTests.length} análisis sueltos
                </span>
              )}
              {" · Total: "}
              <span className="font-semibold text-slate-900">
                S/ {total.toFixed(2)}
              </span>
            </p>
          )}
        </div>

        {profiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-amber-50/50 px-3 py-2">
            <span className="text-xs font-medium text-slate-600">Agregar promoción:</span>
            <select
              className="h-8 rounded border border-slate-200 bg-white px-2 text-sm"
              onChange={(e) => {
                const id = e.target.value;
                if (id) {
                  addProfile(id);
                  e.target.value = "";
                }
              }}
            >
              <option value="">Seleccionar paquete</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.packagePrice != null ? ` — S/ ${p.packagePrice.toFixed(2)}` : ""}
                  {` (${p.tests.length} análisis)`}
                </option>
              ))}
            </select>
            {selectedProfiles.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200"
              >
                {p.name}
                <button
                  type="button"
                  onClick={() => removeProfile(p.id)}
                  className="text-slate-400 hover:text-red-600"
                  title="Quitar"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <Input
            type="text"
            placeholder="Buscar análisis por nombre, código o sección..."
            value={testSearch}
            onChange={(e) => setTestSearch(e.target.value)}
            autoComplete="off"
            className="rounded-lg border-slate-200 pl-10"
          />
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          >
            🔍
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden min-w-0">
          <div className="max-h-[420px] overflow-y-auto overflow-x-hidden">
            {filteredTestsBySection.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                {testSearch.trim()
                  ? "Ningún análisis coincide con la búsqueda."
                  : "No hay análisis disponibles."}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredTestsBySection.map(([sectionLabel, sectionTests]) => (
                  <li key={sectionLabel}>
                    <div className="sticky top-0 z-[1] bg-slate-100/95 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {sectionLabel}
                    </div>
                    <ul className="py-1">
                      {sectionTests.map((test) => {
                        const isInPromo = testIdsInPromos.has(test.id);
                        const promoContaining = getProfileContainingTest(test.id);
                        const isSelected = selectedIds.has(test.id);
                        const isDisabled = isInPromo;
                        return (
                          <li key={test.id}>
                            <label
                              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                isDisabled ? "cursor-default opacity-90" : "cursor-pointer hover:bg-slate-50/80"
                              } ${isSelected ? "bg-blue-50/80" : ""} ${isInPromo ? "bg-amber-50/50" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected || isInPromo}
                                disabled={isDisabled}
                                onChange={() => !isDisabled && toggleTest(test.id)}
                                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 disabled:opacity-70"
                                title={isInPromo ? `Incluido en promoción: ${promoContaining?.name ?? ""}` : undefined}
                              />
                              <span className="flex-1 min-w-0">
                                <span className="font-medium text-slate-900 block truncate">
                                  {test.name}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {test.code}
                                  {isInPromo && promoContaining && (
                                    <span className="ml-2 text-amber-600">
                                      · Incluido en {promoContaining.name}
                                    </span>
                                  )}
                                  {!isInPromo && test.hasTemplate && (
                                    <span className="ml-2 text-blue-600">
                                      · Con plantilla
                                    </span>
                                  )}
                                </span>
                              </span>
                              <span className="text-sm font-medium text-slate-700 shrink-0">
                                S/ {test.price.toFixed(2)}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {(selectedIndividualTests.length > 0 || selectedProfiles.length > 0) && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 space-y-3">
            <p className="text-xs font-medium text-slate-500">
              Resumen (promociones encapsuladas, análisis sueltos aparte)
            </p>
            {selectedProfiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Promociones</p>
                {selectedProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="rounded border border-amber-200 bg-amber-50/50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => removeProfile(p.id)}
                        className="text-slate-400 hover:text-red-600 text-xs"
                        title="Quitar promoción"
                      >
                        × Quitar
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Análisis: {p.tests.map((t) => t.code).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {selectedIndividualTests.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Análisis sueltos</p>
                <ul className="flex flex-wrap gap-2">
                  {selectedIndividualTests.map((t) => (
                    <li
                      key={t.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm border border-slate-200"
                    >
                      {t.code}
                      <button
                        type="button"
                        onClick={() => toggleTest(t.id)}
                        className="text-slate-400 hover:text-red-600 rounded-full p-0.5 leading-none"
                        title="Quitar"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:items-center pt-2 border-t border-slate-200 min-w-0">
        {(selectedProfileIds.length > 0 || selectedIds.size > 0) && (
          <span className="text-sm text-slate-600 sm:mr-4">
            Total: <strong>S/ {total.toFixed(2)}</strong>
          </span>
        )}
        <Button
          type="submit"
          className="w-full sm:w-auto min-w-[160px]"
          disabled={selectedProfileIds.length === 0 && selectedIds.size === 0}
        >
          Crear orden
        </Button>
      </div>
    </form>
  );
}

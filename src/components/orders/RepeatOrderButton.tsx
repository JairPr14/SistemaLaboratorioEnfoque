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
import { toast } from "sonner";
import { Copy, Search, X } from "lucide-react";

type PatientResult = { id: string; label: string; sublabel: string };

type Props = {
  orderId: string;
  patientName?: string;
};

export function RepeatOrderButton({ orderId, patientName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choice" | "new-patient">("choice");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; label: string } | null>(null);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [patientDraft, setPatientDraft] = useState({
    firstName: "",
    lastName: "",
    dni: "",
    sex: "M" as "M" | "F" | "O",
    birthDate: "",
  });

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
        const patients = (data.patients ?? []).map((p: PatientResult) => ({
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

  const resetDialog = () => {
    setStep("choice");
    setPatientQuery("");
    setPatientResults([]);
    setSelectedPatient(null);
    setShowNewPatientForm(false);
    setPatientDraft({
      firstName: "",
      lastName: "",
      dni: "",
      sex: "M",
      birthDate: "",
    });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetDialog();
  };

  const repeatOrder = async (patientId?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/repeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientId ? { patientId } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Error al repetir la orden");
        return;
      }
      toast.success(`Orden ${data.code} creada`);
      handleOpenChange(false);
      router.push(`/orders/${data.orderId}`);
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleSamePatient = () => {
    repeatOrder();
  };

  const handleNewPatientSubmit = async () => {
    let patientId: string | undefined;

    if (selectedPatient) {
      patientId = selectedPatient.id;
    } else if (showNewPatientForm && patientDraft.firstName && patientDraft.lastName && patientDraft.birthDate) {
      try {
        const createRes = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: patientDraft.firstName,
            lastName: patientDraft.lastName,
            dni: patientDraft.dni && String(patientDraft.dni).trim() ? String(patientDraft.dni).trim() : null,
            birthDate: patientDraft.birthDate,
            sex: patientDraft.sex,
          }),
        });
        const createData = await createRes.json().catch(() => ({}));
        if (!createRes.ok) {
          toast.error(createData.error || "Error al crear el paciente");
          return;
        }
        patientId = createData.item?.id;
      } catch {
        toast.error("Error al crear el paciente");
        return;
      }
    } else {
      toast.error("Selecciona un paciente o completa los datos para crear uno");
      return;
    }

    if (patientId) repeatOrder(patientId);
  };

  const canSubmitNewPatient =
    selectedPatient !== null ||
    (showNewPatientForm &&
      patientDraft.firstName.trim().length >= 2 &&
      patientDraft.lastName.trim().length >= 2 &&
      patientDraft.birthDate);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Copy className="mr-2 h-4 w-4" />
        Repetir orden
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === "choice" ? "Repetir orden" : "Seleccionar paciente"}
            </DialogTitle>
          </DialogHeader>

          {step === "choice" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ¿Esta orden es para el mismo paciente o para un nuevo cliente?
              </p>
              {patientName && (
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Paciente actual: <strong>{patientName}</strong>
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSamePatient}
                  disabled={loading}
                >
                  {loading ? "Creando..." : "Mismo paciente"}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep("new-patient")}
                  disabled={loading}
                >
                  Nuevo cliente
                </Button>
              </div>
            </div>
          )}

          {step === "new-patient" && (
            <div className="space-y-4">
              {selectedPatient && !showNewPatientForm ? (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
                  <span className="text-sm font-medium">{selectedPatient.label}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : showNewPatientForm ? (
                <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-600">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Nombre"
                      value={patientDraft.firstName}
                      onChange={(e) =>
                        setPatientDraft((p) => ({ ...p, firstName: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Apellido"
                      value={patientDraft.lastName}
                      onChange={(e) =>
                        setPatientDraft((p) => ({ ...p, lastName: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="DNI"
                      value={patientDraft.dni}
                      onChange={(e) =>
                        setPatientDraft((p) => ({ ...p, dni: e.target.value }))
                      }
                    />
                    <Input
                      type="date"
                      placeholder="Fecha nac."
                      value={patientDraft.birthDate}
                      onChange={(e) =>
                        setPatientDraft((p) => ({ ...p, birthDate: e.target.value }))
                      }
                    />
                    <select
                      value={patientDraft.sex}
                      onChange={(e) =>
                        setPatientDraft((p) => ({
                          ...p,
                          sex: e.target.value as "M" | "F" | "O",
                        }))
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
                    onClick={() => setShowNewPatientForm(false)}
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
                        <li className="px-4 py-3 text-sm text-slate-500">
                          Buscando...
                        </li>
                      ) : patientResults.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-slate-500">
                          Sin resultados
                        </li>
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
                    onClick={() => setShowNewPatientForm(true)}
                    className="text-sm text-slate-600 hover:underline dark:text-slate-400"
                  >
                    Crear paciente rápido
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("choice")}
                  disabled={loading}
                >
                  Atrás
                </Button>
                <Button
                  onClick={handleNewPatientSubmit}
                  disabled={!canSubmitNewPatient || loading}
                >
                  {loading ? "Creando..." : "Repetir para este paciente"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

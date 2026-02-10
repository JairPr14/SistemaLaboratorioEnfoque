import { getSlaLevel, type SlaLevel } from "@/lib/time-utils";

/** Códigos de alerta del motor de reglas */
export type WorklistAlertCode =
  | "OUT_OF_RANGE"
  | "INCOMPLETA"
  | "SIN_VALIDAR"
  | "HCG_POSITIVO"
  | "SLA";

export type WorklistAlert = {
  code: WorklistAlertCode;
  severity: "red" | "yellow" | "green";
  label: string;
};

/** Alerta a nivel orden */
export function getOrderWorklistAlerts(params: {
  status: string;
  createdAt: Date | string;
  totalTests: number;
  completedTests: number;
}): WorklistAlert[] {
  const { status, createdAt, totalTests, completedTests } = params;
  const sla = getSlaLevel(createdAt);
  const alerts: WorklistAlert[] = [];

  if (completedTests < totalTests) {
    const missing = totalTests - completedTests;
    alerts.push({
      code: "INCOMPLETA",
      severity: missing >= 2 || sla === "red" ? "red" : "yellow",
      label: `Incompleta (${completedTests}/${totalTests})`,
    });
  }

  const needsValidation =
    completedTests === totalTests &&
    !["COMPLETADO", "ENTREGADO"].includes(status);
  if (needsValidation) {
    alerts.push({
      code: "SIN_VALIDAR",
      severity: sla === "red" ? "red" : "yellow",
      label: "Sin validar",
    });
  }

  alerts.push({
    code: "SLA",
    severity: sla,
    label: sla === "red" ? "SLA vencido" : sla === "yellow" ? "SLA próximo" : "SLA OK",
  });

  return alerts;
}

/** Alerta OUT_OF_RANGE: algún resultado fuera de refMin/refMax o texto snapshot */
export function hasOutOfRangeAlert(resultItems: { isOutOfRange: boolean }[]): boolean {
  return resultItems.some((r) => r.isOutOfRange);
}

/** Alerta HCG_POSITIVO: test con código/nombre HCG cualitativo y value === "Positivo" */
export function getTestAlerts(params: {
  testCode: string;
  testName: string;
  resultItems: { value: string; isOutOfRange: boolean }[];
}): WorklistAlert[] {
  const { testCode, testName, resultItems } = params;
  const alerts: WorklistAlert[] = [];
  const key = `${testCode} ${testName}`.toUpperCase();

  if (resultItems.some((r) => r.isOutOfRange)) {
    alerts.push({ code: "OUT_OF_RANGE", severity: "yellow", label: "Fuera de rango" });
  }

  if (key.includes("HCG") && resultItems.some((r) => (r.value || "").trim() === "Positivo")) {
    alerts.push({ code: "HCG_POSITIVO", severity: "red", label: "HCG Positivo" });
  }

  return alerts;
}

export function sortByRiskAndAge<T extends { createdAt: Date | string; slaLevel: SlaLevel }>(
  items: T[]
): T[] {
  const score = (sla: SlaLevel) => (sla === "red" ? 0 : sla === "yellow" ? 1 : 2);
  return [...items].sort((a, b) => {
    const sa = score(a.slaLevel);
    const sb = score(b.slaLevel);
    if (sa !== sb) return sa - sb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

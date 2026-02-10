import { getSlaLevel, formatTimeAgo, type SlaLevel } from "@/lib/time-utils";

export type AlertType = "INCOMPLETE" | "UNVALIDATED" | "SLA";
export type AlertSeverity = "green" | "yellow" | "red";

export type OrderAlert = {
  type: AlertType;
  severity: AlertSeverity;
  label: string;
  tooltip: string;
};

export type OrderForAlerts = {
  status: string;
  createdAt: Date | string;
  totalTests: number;
  completedTests: number;
  needsValidation: boolean;
  missingCount: number;
};

/** Obtiene la lista de alertas para una orden, ordenada por severidad (rojo > amarillo > verde) */
export function getOrderAlerts(order: OrderForAlerts): OrderAlert[] {
  const sla = getSlaLevel(order.createdAt);
  const slaLabel = formatTimeAgo(order.createdAt);
  const alerts: OrderAlert[] = [];

  // 1) INCOMPLETA: completedTests < totalTests
  if (order.completedTests < order.totalTests) {
    const missing = order.missingCount;
    let severity: AlertSeverity = "yellow";
    if (missing >= 2 || sla === "red") severity = "red";
    else if (missing === 1) severity = "yellow";

    alerts.push({
      type: "INCOMPLETE",
      severity,
      label: `Incompleta (${order.completedTests}/${order.totalTests})`,
      tooltip: `Faltan ${missing} análisis por capturar`,
    });
  }

  // 2) SIN VALIDAR: captura completa pero no validada
  if (order.needsValidation) {
    let severity: AlertSeverity = "yellow";
    if (sla === "red") severity = "red";

    alerts.push({
      type: "UNVALIDATED",
      severity,
      label: "Sin validar",
      tooltip: "Captura completa pero falta validación",
    });
  }

  // 3) SLA: siempre como indicador
  alerts.push({
    type: "SLA",
    severity: sla,
    label: slaLabel,
    tooltip: `SLA: ${slaLabel}`,
  });

  // Ordenar: rojo primero, amarillo, verde
  const severityOrder: Record<AlertSeverity, number> = {
    red: 0,
    yellow: 1,
    green: 2,
  };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

import { getSlaLevel, formatTimeAgo } from "@/lib/time-utils";
import { formatDateTime } from "@/lib/format";

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
  /** Si la orden ya fue entregada, para mostrar "entregado hace X" */
  deliveredAt?: Date | string | null;
  totalTests: number;
  completedTests: number;
  needsValidation: boolean;
  missingCount: number;
};

/**
 * Obtiene la lista de alertas para una orden.
 * @param order - Datos de la orden
 * @param now - Hora de referencia para "hace X". Si es null/undefined (p. ej. en SSR), se muestra la fecha en lugar del tiempo relativo para evitar desfase por zona horaria del servidor.
 */
export function getOrderAlerts(order: OrderForAlerts, now?: Date | null): OrderAlert[] {
  const createdAgo = formatTimeAgo(order.createdAt, now);
  const createdDateTime = formatDateTime(order.createdAt);
  const sla = getSlaLevel(order.createdAt, now);
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
      tooltip: `Faltan ${missing} análisis por capturar. Creado: ${createdDateTime} (${createdAgo}).`,
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
      tooltip: `Captura completa pero falta validación. Creado: ${createdDateTime} (${createdAgo}).`,
    });
  }

  // 3) SLA: tiempo desde creación (y desde entrega si aplica)
  const slaTooltip =
    order.deliveredAt != null
      ? `Creado: ${createdDateTime} (${createdAgo}). Entregada ${formatTimeAgo(order.deliveredAt, now)}.`
      : `Creado: ${createdDateTime}. Tiempo transcurrido: ${createdAgo}.`;
  alerts.push({
    type: "SLA",
    severity: sla,
    label: `Creado ${createdAgo}`,
    tooltip: slaTooltip,
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

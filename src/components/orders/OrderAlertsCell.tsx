"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getOrderAlerts, type OrderAlert, type OrderForAlerts } from "@/features/lab/order-alerts";

function severityToBadgeVariant(
  severity: OrderAlert["severity"]
): "success" | "warning" | "danger" | "secondary" {
  if (severity === "green") return "success";
  if (severity === "yellow") return "warning";
  return "danger";
}

function AlertBadge({ alert }: { alert: OrderAlert }) {
  const variant = severityToBadgeVariant(alert.severity);
  const dotColor =
    alert.severity === "green"
      ? "bg-emerald-500"
      : alert.severity === "yellow"
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <span title={alert.tooltip}>
      <Badge variant={variant} className="inline-flex items-center gap-1 py-0 font-normal">
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        {alert.label}
      </Badge>
    </span>
  );
}

type Props = { order: OrderForAlerts };

export function OrderAlertsCell({ order }: Props) {
  const [clientNow] = useState<Date>(() => new Date());

  const alerts = getOrderAlerts(order, clientNow);
  const maxVisible = 3;
  const visible = alerts.slice(0, maxVisible);
  const extra = alerts.length - maxVisible;
  const tooltipText =
    alerts.length > maxVisible
      ? alerts.map((a) => `${a.label}: ${a.tooltip}`).join(" | ")
      : undefined;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      title={tooltipText}
    >
      {visible.map((a, i) => (
        <AlertBadge key={`${a.type}-${i}`} alert={a} />
      ))}
      {extra > 0 && (
        <Badge variant="secondary" className="py-0 font-normal" title={tooltipText}>
          +{extra}
        </Badge>
      )}
    </div>
  );
}

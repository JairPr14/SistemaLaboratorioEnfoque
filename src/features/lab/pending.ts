import type { OrderStatus } from "@prisma/client";

export type PendingAlert = "VENCIDA" | "DEMORADA" | "OK";

export function getPendingAlert(status: OrderStatus, createdAt: Date): PendingAlert {
  const now = new Date();
  const diffHours = (now.getTime() - createdAt.getTime()) / 36e5;

  if (status === "PENDIENTE" && diffHours > 6) return "VENCIDA";
  if (status === "EN_PROCESO" && diffHours > 12) return "DEMORADA";
  return "OK";
}

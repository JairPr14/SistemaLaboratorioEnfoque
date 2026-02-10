export type OrderStatusType =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "COMPLETADO"
  | "ENTREGADO"
  | "ANULADO";

export type BadgeVariant = "default" | "secondary" | "warning" | "danger" | "success";

/** Mapea estado de orden a variante de Badge para consistencia visual */
export function statusBadgeVariant(status: OrderStatusType): BadgeVariant {
  switch (status) {
    case "PENDIENTE":
      return "secondary";
    case "EN_PROCESO":
      return "default";
    case "COMPLETADO":
      return "success";
    case "ENTREGADO":
      return "success";
    case "ANULADO":
      return "danger";
    default:
      return "secondary";
  }
}

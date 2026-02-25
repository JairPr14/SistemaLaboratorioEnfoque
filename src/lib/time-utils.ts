/**
 * Formato relativo: "hace 2h", "hace 1d", etc.
 * @param date - Fecha de referencia
 * @param now - Si se pasa null (p. ej. antes del mount en cliente), devuelve la fecha formateada para evitar "hace X" con hora del servidor. Si es undefined, usa la hora actual (comportamiento por defecto).
 */
const PERU_TIMEZONE = "America/Lima";

export function formatTimeAgo(date: Date | string, now?: Date | null): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const nowToUse = now === null ? null : (now ?? new Date());
  if (nowToUse === null) {
    return d.toLocaleDateString("es-PE", {
      timeZone: PERU_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  const diffMs = nowToUse.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return d.toLocaleDateString("es-PE", { timeZone: PERU_TIMEZONE });
}

/** Semáforo SLA: verde < 4h, amarillo 4-12h, rojo > 12h */
export type SlaLevel = "green" | "yellow" | "red";

export function getSlaLevel(createdAt: Date | string, now?: Date | null): SlaLevel {
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const nowMs = now != null ? now.getTime() : Date.now();
  const diffHours = (nowMs - d.getTime()) / 3_600_000;
  if (diffHours < 4) return "green";
  if (diffHours < 12) return "yellow";
  return "red";
}

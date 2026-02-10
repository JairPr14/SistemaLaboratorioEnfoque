/** Formato relativo: "hace 2h", "hace 1d", etc. */
export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return d.toLocaleDateString("es-PE");
}

/** Semáforo SLA: verde < 4h, amarillo 4-12h, rojo > 12h */
export type SlaLevel = "green" | "yellow" | "red";

export function getSlaLevel(createdAt: Date | string): SlaLevel {
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const diffHours = (Date.now() - d.getTime()) / 3_600_000;
  if (diffHours < 4) return "green";
  if (diffHours < 12) return "yellow";
  return "red";
}

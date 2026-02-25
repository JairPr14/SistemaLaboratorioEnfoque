export function formatCurrency(value: number | string) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

const PERU_TIMEZONE = "America/Lima";

export function formatDate(date?: Date | string | null) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-PE", { timeZone: PERU_TIMEZONE });
}

export function formatDateTime(date?: Date | string | null) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-PE", {
    timeZone: PERU_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Nombre del paciente en formato estándar: Apellidos Nombres */
export function formatPatientDisplayName(firstName?: string | null, lastName?: string | null): string {
  const a = String(lastName ?? "").trim();
  const b = String(firstName ?? "").trim();
  return [a, b].filter(Boolean).join(" ") || "—";
}

/** Formato para input datetime-local: YYYY-MM-DDTHH:mm (hora Perú) */
export function toDateTimeLocal(date?: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: PERU_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

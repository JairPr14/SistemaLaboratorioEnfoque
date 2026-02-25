const PERU_OFFSET = "-05:00"; // Peru = UTC-5 (sin horario de verano)

/**
 * Parsea "YYYY-MM-DD" como medianoche en hora Perú.
 * Útil para birthDate, orderDate, etc.
 */
export function parseDatePeru(dateStr: string): Date {
  const trimmed = dateStr?.trim();
  if (!trimmed) return new Date(NaN);
  const iso = `${trimmed}T00:00:00${PERU_OFFSET}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date(dateStr) : d;
}

/** Indica si el string ya incluye zona horaria. */
function hasTimezone(s: string): boolean {
  return /[-+]\d{2}:?\d{2}$/.test(s) || /Z$/i.test(s);
}

/**
 * Parsea datetime (YYYY-MM-DDTHH:mm, YYYY-MM-DDTHH:mm:ss o YYYY-MM-DD) como hora Perú.
 * Para guardar en BD con la hora correcta.
 */
export function parseDateTimePeru(str: string): Date {
  const trimmed = str?.trim();
  if (!trimmed) return new Date(NaN);
  let iso: string;
  if (hasTimezone(trimmed)) {
    iso = trimmed;
  } else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(trimmed)) {
    iso = trimmed + ":00" + PERU_OFFSET;
  } else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}/.test(trimmed)) {
    iso = trimmed.replace(/Z$/i, "") + PERU_OFFSET;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    iso = trimmed + "T00:00:00" + PERU_OFFSET;
  } else if (/^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/.test(trimmed)) {
    const [datePart, timePart] = trimmed.split(/\s+/);
    const parts = (timePart ?? "00:00").split(":");
    const [h, m, s] = [parts[0] ?? "0", parts[1] ?? "0", parts[2] ?? "0"];
    iso = `${datePart}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}${PERU_OFFSET}`;
  } else {
    iso = trimmed;
  }
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date(str) : d;
}

export function parseLocalDate(dateStr: string, endOfDay: boolean): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (y == null || m == null || d == null || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return new Date(dateStr);
  }
  const date = new Date(y, m - 1, d);
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

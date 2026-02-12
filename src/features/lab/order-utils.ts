export function buildPatientCode() {
  return `PAC-${String(Date.now()).slice(-8)}`;
}

const ORDER_CODE_PREFIX = "ORD-";

export function buildOrderCode(sequence: number, date?: Date) {
  const d = date ?? new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const seq = String(sequence).padStart(4, "0");
  return `${ORDER_CODE_PREFIX}${y}${m}${day}-${seq}`;
}

/** Prefijo para un día dado (ej. ORD-20260212-) */
export function orderCodePrefixForDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${ORDER_CODE_PREFIX}${y}${m}${day}-`;
}

/** Extrae el número de secuencia de un orderCode (ej. ORD-20260212-0006 → 6) */
export function parseOrderCodeSequence(orderCode: string): number {
  const part = orderCode.split("-").pop();
  const n = parseInt(part ?? "0", 10);
  return Number.isNaN(n) ? 0 : n;
}

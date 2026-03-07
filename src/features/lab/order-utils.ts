import type { PrismaClient } from "@prisma/client";

export function buildPatientCode() {
  return `PAC-${String(Date.now()).slice(-8)}`;
}

const ORDER_CODE_PREFIX = "ENF-";

/** Genera código correlativo global: ENF-000001, ENF-000002... */
export function buildOrderCode(sequence: number, _date?: Date) {
  const seq = String(sequence).padStart(6, "0");
  return `${ORDER_CODE_PREFIX}${seq}`;
}

/** @deprecated Las órdenes usan secuencia global correlativa */
export function orderCodePrefixForDate(_date: Date) {
  return ORDER_CODE_PREFIX;
}

/** Extrae el número de secuencia (ej. ENF-000006 → 6, ENF-20260212-0006 → 6) */
export function parseOrderCodeSequence(orderCode: string): number {
  const part = orderCode.split("-").pop();
  const n = parseInt(part ?? "0", 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Obtiene el siguiente número correlativo a partir de orderCodes existentes (legacy) */
export function getNextOrderSequence(orderCodes: { orderCode: string }[]): number {
  if (orderCodes.length === 0) return 1;
  const maxSeq = Math.max(...orderCodes.map((o) => parseOrderCodeSequence(o.orderCode)));
  return maxSeq + 1;
}

/** Obtiene el siguiente número correlativo con una sola consulta eficiente (O(1)) */
export async function getNextOrderSequenceAsync(prisma: PrismaClient): Promise<number> {
  const last = await prisma.labOrder.findFirst({
    select: { orderCode: true },
    orderBy: { orderCode: "desc" },
  });
  if (!last) return 1;
  return parseOrderCodeSequence(last.orderCode) + 1;
}

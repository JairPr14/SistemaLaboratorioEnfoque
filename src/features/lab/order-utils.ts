import type { PrismaClient } from "@prisma/client";

const ORDER_CODE_PREFIX = "ENF-";

/** Genera código correlativo global: ENF-000001, ENF-000002... */
export function buildOrderCode(sequence: number, _date?: Date) {
  const seq = String(sequence).padStart(6, "0");
  return `${ORDER_CODE_PREFIX}${seq}`;
}

/** Extrae el número de secuencia (ej. ENF-000006 → 6) */
export function parseOrderCodeSequence(orderCode: string): number {
  const part = orderCode.split("-").pop();
  const n = parseInt(part ?? "0", 10);
  return Number.isNaN(n) ? 0 : n;
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

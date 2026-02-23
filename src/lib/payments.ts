import type { PrismaClient } from "@prisma/client";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function isMissingPaymentTableError(error: unknown): boolean {
  if (!isRecord(error)) return false;

  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";
  const meta = isRecord(error.meta) ? error.meta : null;
  const dbCode = meta && typeof meta.code === "string" ? meta.code : "";

  return (
    code === "P2010" &&
    (dbCode === "42P01" ||
      message.includes('relation "Payment" does not exist') ||
      message.includes("42P01"))
  );
}

export async function getPaidTotalByOrderId(
  prisma: PrismaClient,
  orderId: string,
): Promise<number> {
  try {
    const rows = await prisma.$queryRaw<Array<{ total: number | null }>>`
      SELECT COALESCE(SUM("amount"), 0) as total
      FROM "Payment"
      WHERE "orderId" = ${orderId}
    `;
    return Number(rows[0]?.total ?? 0);
  } catch (error) {
    if (isMissingPaymentTableError(error)) return 0;
    throw error;
  }
}

export async function getPaidTotalsByOrderIds(
  prisma: PrismaClient,
  orderIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (orderIds.length === 0) return result;

  try {
    const placeholders = orderIds.map((_, idx) => `$${idx + 1}`).join(", ");
    const rows = await prisma.$queryRawUnsafe<Array<{ orderId: string; total: number | null }>>(
      `SELECT "orderId", COALESCE(SUM("amount"), 0) as total FROM "Payment" WHERE "orderId" IN (${placeholders}) GROUP BY "orderId"`,
      ...orderIds,
    );
    for (const row of rows) {
      result.set(row.orderId, Number(row.total ?? 0));
    }
    return result;
  } catch (error) {
    if (isMissingPaymentTableError(error)) return result;
    throw error;
  }
}

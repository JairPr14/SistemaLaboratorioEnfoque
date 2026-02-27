import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPaidTotalsByOrderIds } from "./payments";

export type SearchParams = {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  paymentStatus?: "PENDIENTE" | "PARCIAL" | "PAGADO" | string;
  branchId?: string;
};

export function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (y == null || m == null || d == null || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return new Date(dateStr);
  }
  return new Date(y, m - 1, d);
}

export function parseDateRange(params: SearchParams) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  let dateFrom: Date;
  let dateTo: Date;

  const fromParam = params.dateFrom?.trim();
  const toParam = params.dateTo?.trim();

  if (fromParam && toParam) {
    dateFrom = parseLocalDate(fromParam);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo = parseLocalDate(toParam);
    dateTo.setHours(23, 59, 59, 999);
    if (dateFrom.getTime() > dateTo.getTime()) [dateFrom, dateTo] = [dateTo, dateFrom];
  } else if (fromParam) {
    dateFrom = parseLocalDate(fromParam);
    dateFrom.setHours(0, 0, 0, 0);
    dateTo = new Date(today);
  } else if (toParam) {
    dateTo = parseLocalDate(toParam);
    dateTo.setHours(23, 59, 59, 999);
    dateFrom = new Date(dateTo);
    dateFrom.setDate(dateFrom.getDate() - 30);
    dateFrom.setHours(0, 0, 0, 0);
  } else {
    dateTo = new Date(today);
    dateFrom = new Date(today);
    dateFrom.setDate(dateFrom.getDate() - 30);
    dateFrom.setHours(0, 0, 0, 0);
  }

  return { dateFrom, dateTo };
}

export async function buildOrderWhere(
  params: SearchParams
): Promise<{ orderWhere: Prisma.LabOrderWhereInput; dateFrom: Date; dateTo: Date; useDeliveredDate: boolean }> {
  const { dateFrom, dateTo } = parseDateRange(params);
  const statusFilter = params.status?.trim() || undefined;
  const paymentStatusFilter = params.paymentStatus?.trim() || undefined;
  const branchIdFilter = params.branchId?.trim() || undefined;

  const useDeliveredDate = statusFilter === "ENTREGADO";
  const orderWhereWithDate: Prisma.LabOrderWhereInput = useDeliveredDate
    ? {
        status: "ENTREGADO",
        deliveredAt: { not: null, gte: dateFrom, lte: dateTo },
        ...(branchIdFilter ? { branchId: branchIdFilter } : {}),
      }
    : {
        ...(statusFilter ? { status: statusFilter as OrderStatus } : { status: { not: "ANULADO" } }),
        createdAt: { gte: dateFrom, lte: dateTo },
        ...(branchIdFilter ? { branchId: branchIdFilter } : {}),
      };

  let orderWhereFinal: Prisma.LabOrderWhereInput = orderWhereWithDate;
  if (paymentStatusFilter) {
    const baseOrders = await prisma.labOrder.findMany({
      where: orderWhereWithDate,
      select: { id: true, totalPrice: true },
    });
    const baseIds = baseOrders.map((o) => o.id);
    const paidByOrder = await getPaidTotalsByOrderIds(prisma, baseIds);

    const filteredIds = baseOrders
      .filter((o) => {
        const paid = paidByOrder.get(o.id) ?? 0;
        const total = Number(o.totalPrice);
        const state = paid <= 0 ? "PENDIENTE" : paid + 0.0001 < total ? "PARCIAL" : "PAGADO";
        return state === paymentStatusFilter;
      })
      .map((o) => o.id);

    orderWhereFinal = {
      ...orderWhereWithDate,
      id: { in: filteredIds.length > 0 ? filteredIds : ["__none__"] },
    };
  }

  return {
    orderWhere: orderWhereFinal,
    dateFrom,
    dateTo,
    useDeliveredDate,
  };
}

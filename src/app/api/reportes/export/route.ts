import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { OrderStatus, Prisma } from "@prisma/client";

import { authOptions, hasPermission, PERMISSION_REPORTES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaidTotalsByOrderIds } from "@/lib/payments";

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (y == null || m == null || d == null || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return new Date(dateStr);
  }
  return new Date(y, m - 1, d);
}

function parseDateRange(params: URLSearchParams) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const fromParam = params.get("dateFrom")?.trim();
  const toParam = params.get("dateTo")?.trim();

  let dateFrom: Date;
  let dateTo: Date;
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

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, PERMISSION_REPORTES)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const { dateFrom, dateTo } = parseDateRange(searchParams);
  const statusFilter = searchParams.get("status")?.trim() || undefined;
  const paymentStatusFilter = searchParams.get("paymentStatus")?.trim() || undefined;
  const branchIdFilter = searchParams.get("branchId")?.trim() || undefined;

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

  const orders = await prisma.labOrder.findMany({
    where: orderWhereFinal,
    include: {
      patient: true,
      branch: true,
      items: {
        include: {
          labTest: {
            select: {
              isReferred: true,
              externalLabCost: true,
            },
          },
        },
      },
      referredLabPayments: { select: { amount: true } },
    },
    orderBy: useDeliveredDate
      ? [{ deliveredAt: "desc" }, { updatedAt: "desc" }]
      : { createdAt: "desc" },
    take: 5000,
  });

  const orderIds = orders.map((o) => o.id);
  const paidByOrder = await getPaidTotalsByOrderIds(prisma, orderIds);

  const csvRows = [
    [
      "Orden",
      "Fecha",
      "Paciente",
      "Sede",
      "EstadoOrden",
      "TotalFacturado",
      "TotalCobrado",
      "Saldo",
      "EstadoCobro",
      "CostoLabReferido",
      "PagadoALabReferido",
      "PendienteLabReferido",
      "GananciaNeta",
    ],
    ...orders.map((o) => {
      const paid = paidByOrder.get(o.id) ?? 0;
      const total = Number(o.totalPrice);
      const balance = Math.max(0, total - paid);
      const paymentState = paid <= 0 ? "PENDIENTE" : paid + 0.0001 < total ? "PARCIAL" : "PAGADO";
      const patient = `${o.patient.lastName} ${o.patient.firstName}`.trim();
      const date = (useDeliveredDate && o.deliveredAt ? o.deliveredAt : o.createdAt)
        .toISOString()
        .slice(0, 10);
      const branchName = o.branch?.name ?? o.patientType ?? "";
      const costoLabReferido = o.items
        .filter((i) => i.labTest.isReferred && i.labTest.externalLabCost)
        .reduce((s, i) => s + Number(i.labTest.externalLabCost!), 0);
      const pagadoALabReferido = o.referredLabPayments.reduce((s, p) => s + Number(p.amount), 0);
      const pendienteLabReferido = Math.max(0, costoLabReferido - pagadoALabReferido);
      const gananciaNeta = total - costoLabReferido;
      return [
        o.orderCode,
        date,
        patient,
        branchName,
        o.status,
        total.toFixed(2),
        paid.toFixed(2),
        balance.toFixed(2),
        paymentState,
        costoLabReferido.toFixed(2),
        pagadoALabReferido.toFixed(2),
        pendienteLabReferido.toFixed(2),
        gananciaNeta.toFixed(2),
      ];
    }),
  ];

  const csv = csvRows
    .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-caja-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

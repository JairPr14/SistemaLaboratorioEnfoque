import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getPaidTotalsByOrderIds } from "@/lib/payments";

const MAX_QUERY_LENGTH = 100;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 100;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const onlyPending = searchParams.get("onlyPending") === "1";

    // Validación de entrada
    if (!q) {
      return NextResponse.json({ patients: [], orders: [] });
    }

    if (q.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `La búsqueda debe tener al menos ${MIN_QUERY_LENGTH} caracteres` },
        { status: 400 },
      );
    }

    if (q.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `La búsqueda no puede exceder ${MAX_QUERY_LENGTH} caracteres` },
        { status: 400 },
      );
    }

    // Sanitizar query: remover caracteres peligrosos y limitar longitud
    const sanitizedQuery = q
      .slice(0, MAX_QUERY_LENGTH)
      .replace(/[<>\"'%;()&+]/g, "")
      .trim();

    if (sanitizedQuery.length < MIN_QUERY_LENGTH) {
      return NextResponse.json({ patients: [], orders: [] });
    }

    // Usar Prisma queries en lugar de raw queries para mayor seguridad
    const searchPattern = {
      contains: sanitizedQuery,
      mode: "insensitive" as const,
    };
    const exactMatch = {
      equals: sanitizedQuery,
      mode: "insensitive" as const,
    };
    const isNumeric = /^\d+$/.test(sanitizedQuery);
    const patientWhere = {
      deletedAt: null,
      OR: [
        { firstName: searchPattern },
        { lastName: searchPattern },
        { dni: searchPattern },
        ...(isNumeric ? [{ dni: exactMatch }] : []),
      ],
    };

    const [patients, ordersByCode, ordersByPatient] = await Promise.all([
      prisma.patient.findMany({
        where: patientWhere,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dni: true,
        },
        take: Math.min(MAX_RESULTS, 50),
        orderBy: { createdAt: "desc" },
      }),
      prisma.labOrder.findMany({
        where: {
          orderCode: searchPattern,
          ...(onlyPending ? { status: { not: "ANULADO" } } : {}),
        },
        select: {
          id: true,
          orderCode: true,
          totalPrice: true,
          patientId: true,
          patient: { select: { firstName: true, lastName: true, dni: true } },
        },
        take: Math.min(MAX_RESULTS, 50),
        orderBy: { createdAt: "desc" },
      }),
      prisma.labOrder.findMany({
        where: {
          patient: patientWhere,
          ...(onlyPending ? { status: { not: "ANULADO" } } : {}),
        },
        select: {
          id: true,
          orderCode: true,
          totalPrice: true,
          patientId: true,
          patient: { select: { firstName: true, lastName: true, dni: true } },
        },
        take: Math.min(MAX_RESULTS, 50),
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const seenOrderIds = new Set<string>();
    const orderTotals = new Map<string, number>();
    let orders: Array<{ id: string; orderCode: string; patientLabel: string; patientDni: string }> = [];
    for (const o of [...ordersByCode, ...ordersByPatient]) {
      if (seenOrderIds.has(o.id)) continue;
      seenOrderIds.add(o.id);
      orderTotals.set(o.id, Number(o.totalPrice ?? 0));
      const p = o.patient;
      orders.push({
        id: o.id,
        orderCode: o.orderCode,
        patientLabel: p ? `${p.lastName} ${p.firstName}`.trim() : "",
        patientDni: p?.dni ?? "",
      });
    }

    if (onlyPending && orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      const paidByOrder = await getPaidTotalsByOrderIds(prisma, orderIds);
      orders = orders.filter((o) => {
        const paid = paidByOrder.get(o.id) ?? 0;
        const total = orderTotals.get(o.id) ?? 0;
        if (total <= 0) return true;
        return paid + 0.0001 < total;
      });
    }

    return NextResponse.json({
      patients: patients.map((p) => ({
        id: p.id,
        type: "patient",
        label: `${p.lastName} ${p.firstName}`,
        sublabel: p.dni,
        href: `/patients/${p.id}`,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        type: "order",
        label: o.orderCode,
        sublabel: `${o.patientLabel}${o.patientDni ? ` — ${o.patientDni}` : ""}`,
        href: `/orders/${o.id}`,
      })),
    });
  } catch (error) {
    logger.error("Error in search:", error);
    return NextResponse.json(
      { error: "Error al realizar la búsqueda" },
      { status: 500 },
    );
  }
}

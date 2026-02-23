import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { authOptions, hasPermission, PERMISSION_CONVERTIR_ADMISION_A_ORDEN } from "@/lib/auth";
import { buildOrderCode, orderCodePrefixForDate, parseOrderCodeSequence } from "@/features/lab/order-utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!hasPermission(session, PERMISSION_CONVERTIR_ADMISION_A_ORDEN)) {
    return NextResponse.json({ error: "Sin permiso para convertir pre-órdenes" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const admission = await prisma.admissionRequest.findUnique({
      where: { id },
      include: {
        patient: true,
        items: { orderBy: { order: "asc" } },
      },
    });

    if (!admission) return NextResponse.json({ error: "Pre-orden no encontrada" }, { status: 404 });
    if (admission.status !== "PENDIENTE") {
      return NextResponse.json({ error: "La pre-orden no está disponible para conversión" }, { status: 400 });
    }
    if (admission.convertedOrderId) {
      return NextResponse.json({ error: "La pre-orden ya fue convertida" }, { status: 409 });
    }
    if (admission.items.length === 0) {
      return NextResponse.json({ error: "La pre-orden no tiene análisis" }, { status: 400 });
    }

    const tests = await prisma.labTest.findMany({
      where: { id: { in: admission.items.map((item) => item.labTestId) }, deletedAt: null, isActive: true },
      include: {
        template: {
          include: {
            items: {
              include: { refRanges: { orderBy: { order: "asc" } } },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });
    const testsMap = new Map(tests.map((test) => [test.id, test]));

    const orderItemsPayload = admission.items.map((item) => {
      const test = testsMap.get(item.labTestId);
      if (!test) {
        throw new Error(`ANALYSIS_NOT_AVAILABLE:${item.labTestId}`);
      }
      return { item, test };
    });

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const prefix = orderCodePrefixForDate(dayStart);

    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.labOrder.findMany({
        where: { orderCode: { startsWith: prefix } },
        select: { orderCode: true },
      });
      const maxSeq = Math.max(0, ...existing.map((row) => parseOrderCodeSequence(row.orderCode)));
      const orderCode = buildOrderCode(maxSeq + 1, dayStart);

      const order = await tx.labOrder.create({
        data: {
          orderCode,
          patientId: admission.patientId,
          requestedBy: admission.requestedBy ?? null,
          notes: admission.notes ?? null,
          patientType: admission.patientType ?? null,
          branchId: admission.branchId ?? null,
          totalPrice: admission.totalPrice,
          admissionRequestId: admission.id,
          items: {
            createMany: {
              data: orderItemsPayload.map(({ item, test }) => ({
                labTestId: test.id,
                priceSnapshot: item.priceApplied,
                templateSnapshot: test.template
                  ? ({
                      title: test.template.title,
                      notes: test.template.notes,
                      items: test.template.items.map((templateItem) => ({
                        id: templateItem.id,
                        groupName: templateItem.groupName,
                        paramName: templateItem.paramName,
                        unit: templateItem.unit,
                        refRangeText: templateItem.refRangeText,
                        refMin: templateItem.refMin ? Number(templateItem.refMin) : null,
                        refMax: templateItem.refMax ? Number(templateItem.refMax) : null,
                        valueType: templateItem.valueType,
                        selectOptions: templateItem.selectOptions ?? "[]",
                        order: templateItem.order,
                        refRanges: (templateItem.refRanges ?? []).map((range) => ({
                          ageGroup: range.ageGroup,
                          sex: range.sex,
                          refRangeText: range.refRangeText,
                          refMin: range.refMin,
                          refMax: range.refMax,
                          order: range.order ?? 0,
                        })),
                      })),
                    } as const)
                  : undefined,
              })),
            },
          },
        },
        include: { items: true },
      });

      await tx.admissionRequest.update({
        where: { id: admission.id },
        data: {
          status: "CONVERTIDA",
          convertedAt: new Date(),
          convertedOrderId: order.id,
        },
      });

      return order;
    });

    return NextResponse.json({
      item: { id: created.id, orderCode: created.orderCode },
      redirectTo: `/orders/${created.id}`,
    });
  } catch (error) {
    logger.error("Error converting admission to order:", error);
    if (error instanceof Error && error.message.startsWith("ANALYSIS_NOT_AVAILABLE:")) {
      return NextResponse.json(
        { error: "Uno o más análisis de la pre-orden ya no están disponibles en catálogo." },
        { status: 400 },
      );
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "La pre-orden ya fue convertida por otro usuario." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Error al convertir la pre-orden" }, { status: 500 });
  }
}

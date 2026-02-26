import { prisma } from "@/lib/prisma";
import { buildOrderCode, orderCodePrefixForDate, parseOrderCodeSequence } from "@/features/lab/order-utils";

export type ConvertAdmissionResult = { orderId: string; orderCode: string };

/**
 * Convierte una pre-orden de admisión (PENDIENTE) en una orden de laboratorio.
 * Crea la orden, marca la admisión como CONVERTIDA y crea la notificación.
 */
export async function convertAdmissionToOrder(admissionId: string): Promise<ConvertAdmissionResult> {
  const admission = await prisma.admissionRequest.findUnique({
    where: { id: admissionId },
    include: {
      patient: true,
      items: { orderBy: { order: "asc" } },
    },
  });

  if (!admission) throw new Error("ADMISSION_NOT_FOUND");
  if (admission.status !== "PENDIENTE") {
    throw new Error("ADMISSION_NOT_PENDING");
  }
  if (admission.convertedOrderId) {
    throw new Error("ADMISSION_ALREADY_CONVERTED");
  }
  if (admission.items.length === 0) {
    throw new Error("ADMISSION_NO_ITEMS");
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
              priceConventionSnapshot: test.priceToAdmission != null ? Number(test.priceToAdmission) : Number(test.price),
              templateSnapshot: test.template
                ? JSON.stringify({
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
                  })
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

    await tx.notification.create({
      data: {
        type: "ADMISSION_CONVERTED",
        title: "Nueva orden desde Admisión",
        message: `La pre-orden fue convertida en orden ${order.orderCode}.`,
        linkTo: `/orders/${order.id}`,
        relatedOrderId: order.id,
      },
    });

    return order;
  });

  return { orderId: created.id, orderCode: created.orderCode };
}

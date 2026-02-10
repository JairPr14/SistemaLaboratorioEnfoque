import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { quickOrderSchema } from "@/features/lab/schemas";
import { buildOrderCode } from "@/features/lab/order-utils";
import { generateNextPatientCode } from "@/lib/patient-code";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = quickOrderSchema.parse(body);

    let patientId: string;

    if (parsed.patientId) {
      const existing = await prisma.patient.findFirst({
        where: { id: parsed.patientId, deletedAt: null },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Paciente no encontrado" },
          { status: 400 }
        );
      }
      patientId = existing.id;
    } else if (parsed.patientDraft) {
      const draft = parsed.patientDraft;
      const code = await generateNextPatientCode();
      const firstName = draft.firstName.trim().toUpperCase();
      const lastName = draft.lastName.trim().toUpperCase();

      const patient = await prisma.patient.create({
        data: {
          code,
          dni: draft.dni.trim(),
          firstName,
          lastName,
          birthDate: new Date(draft.birthDate),
          sex: draft.sex,
        },
      });
      patientId = patient.id;
    } else {
      return NextResponse.json(
        { error: "Se requiere patientId o patientDraft" },
        { status: 400 }
      );
    }

    const tests = await prisma.labTest.findMany({
      where: {
        id: { in: parsed.tests },
        deletedAt: null,
        isActive: true,
      },
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

    if (!tests.length) {
      return NextResponse.json(
        { error: "No hay análisis válidos" },
        { status: 400 }
      );
    }

    const totalPrice = tests.reduce((acc, t) => acc + Number(t.price), 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await prisma.labOrder.count({
      where: { createdAt: { gte: todayStart } },
    });
    const orderCode = buildOrderCode(todayCount + 1);

    const order = await prisma.labOrder.create({
      data: {
        orderCode,
        patientId,
        requestedBy: parsed.doctorName ?? null,
        notes: parsed.indication ?? null,
        totalPrice,
        items: {
          createMany: {
            data: tests.map((test) => ({
              labTestId: test.id,
              priceSnapshot: test.price,
              templateSnapshot: test.template
                ? ({
                    title: test.template.title,
                    notes: test.template.notes,
                    items: test.template.items.map((item) => ({
                      id: item.id,
                      groupName: item.groupName,
                      paramName: item.paramName,
                      unit: item.unit,
                      refRangeText: item.refRangeText,
                      refMin: item.refMin ? Number(item.refMin) : null,
                      refMax: item.refMax ? Number(item.refMax) : null,
                      valueType: item.valueType,
                      selectOptions: item.selectOptions ?? "[]",
                      order: item.order,
                      refRanges: (item.refRanges ?? []).map((r) => ({
                        ageGroup: r.ageGroup,
                        sex: r.sex,
                        refRangeText: r.refRangeText,
                        refMin: r.refMin,
                        refMax: r.refMax,
                        order: r.order ?? 0,
                      })),
                    })),
                  } as const)
                : undefined,
            })),
          },
        },
      },
    });

    return NextResponse.json({
      orderId: order.id,
      code: orderCode,
    });
  } catch (error) {
    console.error("Error creating quick order:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error al crear la orden" },
      { status: 500 }
    );
  }
}

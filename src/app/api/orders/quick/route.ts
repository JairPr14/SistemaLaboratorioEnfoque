import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { quickOrderSchema } from "@/features/lab/schemas";
import {
  buildOrderCode,
  orderCodePrefixForDate,
  parseOrderCodeSequence,
} from "@/features/lab/order-utils";
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

    type TestWithTemplate = Awaited<ReturnType<typeof prisma.labTest.findMany>>[number];
    const fullInclude = {
      template: {
        include: {
          items: {
            include: { refRanges: { orderBy: { order: "asc" as const } } },
            orderBy: { order: "asc" as const },
          },
        },
      },
    } as const;

    type OrderItemPayload = {
      test: TestWithTemplate;
      priceSnapshot: number;
      promotionId?: string | null;
      promotionName?: string | null;
    };
    const orderItemsPayload: OrderItemPayload[] = [];
    const fromProfileTestIds = new Set<string>();

    if (parsed.profileIds && parsed.profileIds.length > 0) {
      const profiles = await prisma.testProfile.findMany({
        where: { id: { in: parsed.profileIds }, isActive: true },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: { labTest: { include: fullInclude } },
          },
        },
      });
      for (const profile of profiles) {
        const profileTests = profile.items.map((i) => i.labTest).filter(Boolean);
        if (profileTests.length === 0) continue;
        const priceEach =
          profile.packagePrice != null
            ? Number(profile.packagePrice) / profileTests.length
            : null;
        for (const test of profileTests) {
          orderItemsPayload.push({
            test,
            priceSnapshot: priceEach ?? Number(test.price),
            promotionId: profile.id,
            promotionName: profile.name,
          });
          fromProfileTestIds.add(test.id);
        }
      }
    }

    const individualTestIds = (parsed.tests ?? []).filter((id) => !fromProfileTestIds.has(id));
    if (individualTestIds.length > 0) {
      const individualTests = await prisma.labTest.findMany({
        where: { id: { in: individualTestIds }, deletedAt: null, isActive: true },
        include: fullInclude,
      });
      for (const test of individualTests) {
        orderItemsPayload.push({ test, priceSnapshot: Number(test.price) });
      }
    }

    if (orderItemsPayload.length === 0) {
      return NextResponse.json(
        { error: "No hay análisis válidos" },
        { status: 400 }
      );
    }

    const totalPrice = orderItemsPayload.reduce((acc, x) => acc + x.priceSnapshot, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const prefix = orderCodePrefixForDate(todayStart);

    let order: Awaited<ReturnType<typeof prisma.labOrder.create>>;
    let orderCode: string;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const existing = await prisma.labOrder.findMany({
        where: { orderCode: { startsWith: prefix } },
        select: { orderCode: true },
      });
      const sequences = existing.map((o) => parseOrderCodeSequence(o.orderCode));
      const maxSeq = sequences.length > 0 ? Math.max(...sequences) : 0;
      orderCode = buildOrderCode(maxSeq + 1, todayStart);

      try {
        order = await prisma.labOrder.create({
          data: {
            orderCode,
            patientId,
            requestedBy: parsed.doctorName ?? null,
            notes: parsed.indication ?? null,
            patientType: parsed.patientType ?? null,
            totalPrice,
            items: {
              createMany: {
            data: orderItemsPayload.map(({ test, priceSnapshot, promotionId, promotionName }) => ({
              labTestId: test.id,
              priceSnapshot,
              promotionId: promotionId ?? undefined,
              promotionName: promotionName ?? undefined,
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
        break;
      } catch (err) {
        const isUnique =
          err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002";
        if (isUnique && attempt < maxRetries - 1) continue;
        throw err;
      }
    }

    return NextResponse.json({
      orderId: order!.id,
      code: orderCode!,
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

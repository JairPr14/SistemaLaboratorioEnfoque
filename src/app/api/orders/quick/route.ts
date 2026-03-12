import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { quickOrderSchema } from "@/features/lab/schemas";
import {
  buildOrderCode,
  getNextOrderSequenceAsync,
} from "@/features/lab/order-utils";
import { generateNextPatientCode } from "@/lib/patient-code";
import { parseDatePeru } from "@/lib/date";

import { getServerSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

      const dniVal = draft.dni && String(draft.dni).trim() ? String(draft.dni).trim() : undefined;
      const birthDateValue =
        draft.birthDate && String(draft.birthDate).trim()
          ? parseDatePeru(draft.birthDate)
          : draft.ageYears != null && !Number.isNaN(draft.ageYears)
            ? parseDatePeru(`${new Date().getFullYear() - draft.ageYears}-01-01`)
            : parseDatePeru("2000-01-01");
      const patient = await prisma.patient.create({
        data: {
          code,
          ...(dniVal != null ? { dni: dniVal } : {}),
          firstName,
          lastName,
          birthDate: birthDateValue,
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
    type TestWithTemplate = Prisma.LabTestGetPayload<{ include: typeof fullInclude }>;

    type OrderItemPayload = {
      test: TestWithTemplate;
      priceSnapshot: number;
      promotionId?: string | null;
      promotionName?: string | null;
    };
    const orderItemsPayload: OrderItemPayload[] = [];
    const fromProfileTestIds = new Set<string>();
    const profileIds = parsed.profileIds ?? [];
    const testIds = parsed.tests ?? [];

    const [profiles, allRequestedTests] = await Promise.all([
      profileIds.length > 0
        ? prisma.testProfile.findMany({
            where: { id: { in: profileIds }, isActive: true },
            include: {
              items: {
                orderBy: { order: "asc" },
                include: { labTest: { include: fullInclude } },
              },
            },
          })
        : Promise.resolve([]),
      testIds.length > 0
        ? prisma.labTest.findMany({
            where: { id: { in: testIds }, deletedAt: null, isActive: true },
            include: fullInclude,
          })
        : Promise.resolve([]),
    ]);

    for (const profile of profiles) {
      const profileTests = profile.items.map((i) => i.labTest).filter(Boolean);
      if (profileTests.length === 0) continue;
      const priceEach =
        profile.packagePrice != null
          ? Number(profile.packagePrice) / profileTests.length
          : null;
      for (const test of profileTests) {
        fromProfileTestIds.add(test.id);
        orderItemsPayload.push({
          test,
          priceSnapshot: priceEach ?? Number(test.price),
          promotionId: profile.id,
          promotionName: profile.name,
        });
      }
    }

    const individualTestIds = testIds.filter((id) => !fromProfileTestIds.has(id));
    for (const test of allRequestedTests) {
      if (individualTestIds.includes(test.id)) {
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
    const quickNotes =
      parsed.priority === "URGENTE"
        ? `[URGENTE] ${parsed.indication ?? ""}`.trim()
        : parsed.indication ?? null;

    let order: Awaited<ReturnType<typeof prisma.labOrder.create>>;
    let orderCode: string;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const nextSeq = await getNextOrderSequenceAsync(prisma);
      orderCode = buildOrderCode(nextSeq);

      try {
        order = await prisma.labOrder.create({
          data: {
            orderCode,
            patientId,
            requestedBy: parsed.doctorName ?? null,
            notes: quickNotes,
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
                    ? JSON.stringify({
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
                      })
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
    logger.error("Error creating quick order:", error);
    if (error && typeof error === "object" && "name" in error && (error as { name: string }).name === "ZodError") {
      const zodError = error as { errors?: Array<{ message?: string; path?: (string | number)[] }> };
      const firstMsg = zodError.errors?.[0]?.message;
      return NextResponse.json(
        { error: firstMsg || "Datos inválidos" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error al crear la orden" },
      { status: 500 }
    );
  }
}

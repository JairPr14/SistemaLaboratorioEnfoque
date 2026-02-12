import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { orderCreateSchema } from "@/features/lab/schemas";
import {
  buildOrderCode,
  orderCodePrefixForDate,
  parseOrderCodeSequence,
} from "@/features/lab/order-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const patientId = searchParams.get("patientId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const items = await prisma.labOrder.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(patientId ? { patientId } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        patient: true,
        items: { include: { labTest: true, result: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error al obtener órdenes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = orderCreateSchema.parse(payload);

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
    const testsFromProfiles: OrderItemPayload[] = [];
    const fromProfileTestIds = new Set<string>();

    if (parsed.profileIds && parsed.profileIds.length > 0) {
      const profiles = await prisma.testProfile.findMany({
        where: { id: { in: parsed.profileIds }, isActive: true },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: {
              labTest: {
                include: fullInclude,
              },
            },
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
          const price = priceEach ?? Number(test.price);
          testsFromProfiles.push({
            test,
            priceSnapshot: price,
            promotionId: profile.id,
            promotionName: profile.name,
          });
          fromProfileTestIds.add(test.id);
        }
      }
    }

    const individualTestIds = (parsed.labTestIds ?? []).filter((id) => !fromProfileTestIds.has(id));
    const individualTests = await prisma.labTest.findMany({
      where: { id: { in: individualTestIds }, deletedAt: null, isActive: true },
      include: fullInclude,
    });

    const onlyIndividual: OrderItemPayload[] = individualTests.map((test) => ({
      test,
      priceSnapshot: Number(test.price),
    }));
    const orderItemsPayload: OrderItemPayload[] = [...testsFromProfiles, ...onlyIndividual];

    if (orderItemsPayload.length === 0) {
      return NextResponse.json({ error: "No hay análisis válidos." }, { status: 400 });
    }

    const totalPrice = orderItemsPayload.reduce((acc, x) => acc + x.priceSnapshot, 0);

    const orderDate = parsed.orderDate
      ? new Date(parsed.orderDate + "T00:00:00")
      : new Date();
    const dayStart = new Date(orderDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const prefix = orderCodePrefixForDate(dayStart);
    let order: Awaited<ReturnType<typeof prisma.labOrder.create>>;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const existing = await prisma.labOrder.findMany({
        where: { orderCode: { startsWith: prefix } },
        select: { orderCode: true },
      });
      const sequences = existing.map((o) => parseOrderCodeSequence(o.orderCode));
      const maxSeq = sequences.length > 0 ? Math.max(...sequences) : 0;
      const orderCode = buildOrderCode(maxSeq + 1, dayStart);

      try {
        order = await prisma.labOrder.create({
          data: {
            orderCode,
            patientId: parsed.patientId,
            requestedBy: parsed.requestedBy ?? null,
            notes: parsed.notes ?? null,
            patientType: parsed.patientType ?? null,
            totalPrice,
            createdAt: dayStart,
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
          include: { items: true },
        });
        break;
      } catch (err) {
        const isUnique =
          err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002";
        if (isUnique && attempt < maxRetries - 1) continue;
        throw err;
      }
    }

    return NextResponse.json({ item: order! });
  } catch (error) {
    console.error("Error creating order:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Error al crear orden" },
      { status: 500 },
    );
  }
}

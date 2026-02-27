import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { orderCreateSchema } from "@/features/lab/schemas";
import { getServerSession, hasAnyPermission, PERMISSION_GESTIONAR_ADMISION, PERMISSION_VER_ORDENES } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  buildOrderCode,
  getNextOrderSequence,
} from "@/features/lab/order-utils";
import { parseDatePeru } from "@/lib/date";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const canAccess = hasAnyPermission(session, [
    PERMISSION_VER_ORDENES,
    PERMISSION_GESTIONAR_ADMISION,
  ]);
  if (!canAccess) {
    return NextResponse.json({ error: "Sin permiso para ver órdenes" }, { status: 403 });
  }

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
    logger.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error al obtener órdenes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const isAdmissionOrder = payload?.orderSource === "ADMISION";
  const canCreate = isAdmissionOrder
    ? hasAnyPermission(session, [PERMISSION_GESTIONAR_ADMISION])
    : hasAnyPermission(session, [PERMISSION_VER_ORDENES, PERMISSION_GESTIONAR_ADMISION]);
  if (!canCreate) {
    return NextResponse.json({ error: "Sin permiso para crear órdenes" }, { status: 403 });
  }

  try {
    const parsed = orderCreateSchema.parse(payload);

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
      priceConventionSnapshot?: number | null;
      referredLabId?: string | null;
      externalLabCostSnapshot?: number | null;
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
          const convention = test.priceToAdmission != null ? Number(test.priceToAdmission) : price;
          testsFromProfiles.push({
            test,
            priceSnapshot: price,
            priceConventionSnapshot: parsed.orderSource === "ADMISION" ? convention : undefined,
            referredLabId: parsed.orderSource === "ADMISION" && test.isReferred ? (test.referredLabId ?? undefined) : undefined,
            externalLabCostSnapshot: parsed.orderSource === "ADMISION" && test.externalLabCost != null ? Number(test.externalLabCost) : undefined,
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
      include: { ...fullInclude, referredLab: true },
    });

    const onlyIndividual: OrderItemPayload[] = individualTests.map((test) => {
      const price = Number(test.price);
      const convention = test.priceToAdmission != null ? Number(test.priceToAdmission) : price;
      return {
        test,
        priceSnapshot: price,
        priceConventionSnapshot: parsed.orderSource === "ADMISION" ? convention : undefined,
        referredLabId: parsed.orderSource === "ADMISION" && test.isReferred ? (test.referredLabId ?? undefined) : undefined,
        externalLabCostSnapshot: parsed.orderSource === "ADMISION" && test.externalLabCost != null ? Number(test.externalLabCost) : undefined,
      };
    });
    const orderItemsPayload: OrderItemPayload[] = [...testsFromProfiles, ...onlyIndividual];

    if (orderItemsPayload.length === 0) {
      return NextResponse.json({ error: "No hay análisis válidos." }, { status: 400 });
    }

    const totalPrice = orderItemsPayload.reduce((acc, x) => acc + x.priceSnapshot, 0);

    const orderDate = parsed.orderDate
      ? parseDatePeru(parsed.orderDate)
      : new Date();
    // Usar medianoche Perú. parseDatePeru ya da eso. Sin orderDate, "hoy" en zona Perú (evita día atrás en PDF).
    const dayStart = parsed.orderDate
      ? orderDate
      : (() => {
          const fmt = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Lima",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const parts = fmt.formatToParts(new Date());
          const y = parts.find((p) => p.type === "year")?.value ?? "";
          const m = parts.find((p) => p.type === "month")?.value ?? "";
          const d = parts.find((p) => p.type === "day")?.value ?? "";
          return new Date(`${y}-${m}-${d}T00:00:00-05:00`);
        })();
    let order: Awaited<ReturnType<typeof prisma.labOrder.create>>;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const existing = await prisma.labOrder.findMany({
        select: { orderCode: true },
      });
      const nextSeq = getNextOrderSequence(existing);
      const orderCode = buildOrderCode(nextSeq);

      try {
        order = await prisma.labOrder.create({
          data: {
            orderCode,
            patientId: parsed.patientId,
            requestedBy: parsed.requestedBy ?? null,
            notes: parsed.notes ?? null,
            patientType: parsed.patientType ?? null,
            branchId: parsed.branchId ?? undefined,
            orderSource: parsed.orderSource === "ADMISION" ? "ADMISION" : "LABORATORIO",
            createdById: parsed.orderSource === "ADMISION" ? session.user.id : undefined,
            totalPrice,
            createdAt: dayStart,
            items: {
              createMany: {
                data: orderItemsPayload.map(({ test, priceSnapshot, priceConventionSnapshot, referredLabId, externalLabCostSnapshot, promotionId, promotionName }) => ({
                  labTestId: test.id,
                  priceSnapshot,
                  priceConventionSnapshot: priceConventionSnapshot ?? undefined,
                  referredLabId: referredLabId ?? undefined,
                  externalLabCostSnapshot: externalLabCostSnapshot ?? undefined,
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
          include: { items: true },
        });
        if (parsed.orderSource === "ADMISION" && parsed.initialPayment) {
          await prisma.payment.create({
            data: {
              orderId: order!.id,
              amount: parsed.initialPayment.amount,
              method: parsed.initialPayment.method,
              recordedById: session.user.id,
            },
          });
        }
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
    logger.error("Error creating order:", error);
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

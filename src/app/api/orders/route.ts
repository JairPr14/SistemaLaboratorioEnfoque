import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { orderCreateSchema } from "@/features/lab/schemas";
import { getServerSession, hasAnyPermission, PERMISSION_VER_ORDENES } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  buildOrderCode,
  getNextOrderSequenceAsync,
} from "@/features/lab/order-utils";
import { parseDatePeru } from "@/lib/date";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const canAccess = hasAnyPermission(session, [PERMISSION_VER_ORDENES]);
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

  const canCreate = hasAnyPermission(session, [PERMISSION_VER_ORDENES]);
  if (!canCreate) {
    return NextResponse.json({ error: "Sin permiso para crear órdenes" }, { status: 403 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
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
    const profileIds = parsed.profileIds ?? [];
    const labTestIds = parsed.labTestIds ?? [];

    const [profiles, individualTests] = await Promise.all([
      profileIds.length > 0
        ? prisma.testProfile.findMany({
            where: { id: { in: profileIds }, isActive: true },
            include: {
              items: {
                orderBy: { order: "asc" },
                include: {
                  labTest: { include: fullInclude },
                },
              },
            },
          })
        : Promise.resolve([]),
      labTestIds.length > 0
        ? prisma.labTest.findMany({
            where: { id: { in: labTestIds }, deletedAt: null, isActive: true },
            include: { ...fullInclude, referredLab: true },
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
        const publicPrice = priceEach ?? Number(test.price);
        const conventionPrice = test.priceToAdmission != null ? Number(test.priceToAdmission) : publicPrice;
        const useConvention = parsed.priceType === "CONVENIO";
        testsFromProfiles.push({
          test,
          priceSnapshot: useConvention ? conventionPrice : publicPrice,
          priceConventionSnapshot: useConvention ? conventionPrice : undefined,
          referredLabId: test.isReferred ? (test.referredLabId ?? undefined) : undefined,
          externalLabCostSnapshot: test.externalLabCost != null ? Number(test.externalLabCost) : undefined,
          promotionId: profile.id,
          promotionName: profile.name,
        });
      }
    }

    const individualTestIds = labTestIds.filter((id) => !fromProfileTestIds.has(id));
    const individualTestsFiltered = individualTests.filter((t) => individualTestIds.includes(t.id));

    const useConvention = parsed.priceType === "CONVENIO";
    const onlyIndividual: OrderItemPayload[] = individualTestsFiltered.map((test) => {
      const publicPrice = Number(test.price);
      const conventionPrice = test.priceToAdmission != null ? Number(test.priceToAdmission) : publicPrice;
      return {
        test,
        priceSnapshot: useConvention ? conventionPrice : publicPrice,
        priceConventionSnapshot: useConvention ? conventionPrice : undefined,
        referredLabId: test.isReferred ? (test.referredLabId ?? undefined) : undefined,
        externalLabCostSnapshot: test.externalLabCost != null ? Number(test.externalLabCost) : undefined,
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
      const nextSeq = await getNextOrderSequenceAsync(prisma);
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
            orderSource: "LABORATORIO",
            priceType: parsed.priceType ?? "PUBLICO",
            createdById: session.user.id,
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
        revalidatePath("/orders");
        revalidatePath("/dashboard");
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

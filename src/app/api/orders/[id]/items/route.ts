import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { orderAddItemsSchema } from "@/features/lab/schemas";

import { getServerSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";

type Params = { params: Promise<{ id: string }> };

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

function buildTemplateSnapshot(test: { template?: { title: string; notes: string | null; items: Array<{
  id: string; groupName: string | null; paramName: string; unit: string | null; refRangeText: string | null;
  refMin: number | null; refMax: number | null; valueType: string; selectOptions: string; order: number;
  refRanges: Array<{ ageGroup: string | null; sex: string | null; refRangeText: string | null; refMin: number | null; refMax: number | null; order: number }>;
}> } | null }) {
  if (!test.template) return undefined;
  return JSON.stringify({
    title: test.template.title,
    notes: test.template.notes,
    items: test.template.items.map((item) => ({
      id: item.id,
      groupName: item.groupName,
      paramName: item.paramName,
      unit: item.unit,
      refRangeText: item.refRangeText,
      refMin: item.refMin,
      refMax: item.refMax,
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
  });
}

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id: orderId } = await params;
    const payload = await request.json();
    const parsed = orderAddItemsSchema.parse(payload);

    const labTestIds = parsed.labTestIds ?? [];
    const profileIds = parsed.profileIds ?? [];

    const order = await prisma.labOrder.findFirst({
      where: { id: orderId },
      include: {
        items: {
          select: {
            labTestId: true,
            promotionId: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.status === "ANULADO") {
      return NextResponse.json(
        { error: "No se pueden añadir análisis a una orden anulada." },
        { status: 400 },
      );
    }

    const existingLabTestIds = new Set(order.items.map((i) => i.labTestId));
    const existingPromotionIds = new Set(
      order.items.map((i) => i.promotionId).filter((id): id is string => id != null),
    );

    // Perfiles ya en la orden: obtener tests para detectar duplicados
    let testIdsInExistingPromotions = new Set<string>();
    if (existingPromotionIds.size > 0) {
      const existingProfiles = await prisma.testProfile.findMany({
        where: { id: { in: [...existingPromotionIds] } },
        include: { items: { select: { labTestId: true } } },
      });
      testIdsInExistingPromotions = new Set(
        existingProfiles.flatMap((p) => p.items.map((i) => i.labTestId)),
      );
    }

    const itemsToCreate: Array<{
      labTestId: string;
      priceSnapshot: number;
      templateSnapshot: string | undefined;
      promotionId?: string;
      promotionName?: string;
      referredLabId?: string;
      externalLabCostSnapshot?: number;
    }> = [];
    let addedFromProfiles = 0;

    // Añadir promociones
    const profileIdsToAdd = [...new Set(profileIds)].filter((id) => !existingPromotionIds.has(id));
    if (profileIdsToAdd.length > 0) {
      const profiles = await prisma.testProfile.findMany({
        where: { id: { in: profileIdsToAdd }, isActive: true },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: {
              labTest: { include: { ...fullInclude, referredLab: true } },
            },
          },
        },
      });

      for (const profile of profiles) {
        const profileTests = profile.items.map((i) => i.labTest).filter(Boolean);
        if (profileTests.length === 0) continue;

        const hasConflict = profileTests.some((t) => existingLabTestIds.has(t.id) || testIdsInExistingPromotions.has(t.id));
        if (hasConflict) {
          return NextResponse.json(
            {
              error: `La promoción "${profile.name}" incluye análisis que ya están en la orden. No se puede añadir.`,
            },
            { status: 400 },
          );
        }

        const priceEach =
          profile.packagePrice != null ? Number(profile.packagePrice) / profileTests.length : null;
        for (const test of profileTests) {
          existingLabTestIds.add(test.id);
          const publicPrice = priceEach ?? Number(test.price);
          itemsToCreate.push({
            labTestId: test.id,
            priceSnapshot: publicPrice,
            templateSnapshot: buildTemplateSnapshot(test),
            promotionId: profile.id,
            promotionName: profile.name,
            referredLabId: test.isReferred && test.referredLabId ? test.referredLabId : undefined,
            externalLabCostSnapshot: test.externalLabCost != null ? Number(test.externalLabCost) : undefined,
          });
        }
        addedFromProfiles += profileTests.length;
      }
    }

    // Verificar análisis individuales: no duplicar con promociones existentes
    const duplicatesInPromotions = labTestIds.filter((id) => testIdsInExistingPromotions.has(id));
    if (duplicatesInPromotions.length > 0) {
      return NextResponse.json(
        {
          error: `Los siguientes análisis ya están en promociones de esta orden: no se pueden agregar duplicados.`,
        },
        { status: 400 },
      );
    }

    const uniqueLabTestIds = [...new Set(labTestIds)];
    const labTestIdsToAdd = uniqueLabTestIds.filter((tid) => !existingLabTestIds.has(tid));

    if (labTestIdsToAdd.length > 0) {
      const tests = await prisma.labTest.findMany({
        where: { id: { in: labTestIdsToAdd }, deletedAt: null, isActive: true },
        include: { ...fullInclude, referredLab: true },
      });

      for (const test of tests) {
        itemsToCreate.push({
          labTestId: test.id,
          priceSnapshot: Number(test.price),
          templateSnapshot: buildTemplateSnapshot(test),
          referredLabId: test.isReferred && test.referredLabId ? test.referredLabId : undefined,
          externalLabCostSnapshot: test.externalLabCost != null ? Number(test.externalLabCost) : undefined,
        });
      }
    }

    if (itemsToCreate.length === 0) {
      return NextResponse.json(
        {
          error:
            profileIds.length > 0 || labTestIds.length > 0
              ? "Todos los análisis y promociones seleccionados ya están en la orden."
              : "Selecciona al menos un análisis o una promoción.",
        },
        { status: 400 },
      );
    }

    const addedPrice = itemsToCreate.reduce((acc, i) => acc + i.priceSnapshot, 0);
    const newTotal = Number(order.totalPrice) + addedPrice;

    await prisma.$transaction(async (tx) => {
      await tx.labOrderItem.createMany({
        data: itemsToCreate.map((item) => ({
          orderId,
          labTestId: item.labTestId,
          priceSnapshot: item.priceSnapshot,
          templateSnapshot: item.templateSnapshot,
          promotionId: item.promotionId,
          promotionName: item.promotionName,
          referredLabId: item.referredLabId,
          externalLabCostSnapshot: item.externalLabCostSnapshot,
        })),
      });
      await tx.labOrder.update({
        where: { id: orderId },
        data: { totalPrice: newTotal },
      });
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      added: itemsToCreate.length,
      addedFromProfiles,
      newTotal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    return handleApiError(error, "Error al añadir análisis a la orden");
  }
}

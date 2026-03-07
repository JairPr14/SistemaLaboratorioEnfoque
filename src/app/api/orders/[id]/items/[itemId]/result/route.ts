import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resultSchema } from "@/features/lab/schemas";
import {
  getServerSession,
  requirePermission,
  PERMISSION_CAPTURAR_RESULTADOS,
  PERMISSION_ELIMINAR_REGISTROS,
} from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id, itemId } = await params;
    const orderItem = await prisma.labOrderItem.findFirst({
      where: { id: itemId, orderId: id },
      include: {
        labTest: { include: { template: { include: { items: true } } } },
        result: { include: { items: { orderBy: { order: "asc" } } } },
      },
    });

    if (!orderItem) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ item: orderItem });
  } catch (error) {
    return handleApiError(error, "Error al obtener resultado");
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_CAPTURAR_RESULTADOS);
  if (auth.response) return auth.response;
  return upsertResult(request, params, auth.session);
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requirePermission(PERMISSION_CAPTURAR_RESULTADOS);
  if (auth.response) return auth.response;
  return upsertResult(request, params, auth.session);
}

type SessionWithUser = { user: { id: string; roleCode?: string | null; permissions?: string[] } };

async function upsertResult(
  request: Request,
  paramsPromise: Params["params"],
  session: SessionWithUser,
) {
  try {
    const params = await paramsPromise;
    const payload = await request.json();
    const parsed = resultSchema.parse(payload);

    const orderItem = await prisma.labOrderItem.findFirst({
      where: { id: params.itemId, orderId: params.id },
      include: {
        order: true,
        result: true,
        labTest: { include: { template: { include: { items: { select: { id: true } } } } } },
      },
    });

    if (!orderItem) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    // Bloqueo: no editar resultados ya validados (isDraft=false), salvo admin con ELIMINAR_REGISTROS
    const existing = orderItem.result;
    if (existing && !existing.isDraft) {
      const canOverride =
        session.user.roleCode === "ADMIN" ||
        (session.user.permissions ?? []).includes(PERMISSION_ELIMINAR_REGISTROS);
      if (!canOverride) {
        return NextResponse.json(
          { error: "El resultado ya está validado. No se puede modificar sin permisos de administrador." },
          { status: 403 },
        );
      }
    }

    // Solo los IDs de LabTemplateItem son válidos para la FK; los extra (extra-xxx) no existen en BD
    const templateIds = new Set(
      orderItem.labTest.template?.items?.map((i) => i.id) ?? []
    );

    const now = new Date();
    const data = {
      reportedAt: now,
      reportedBy: parsed.reportedBy ?? null,
      comment: parsed.comment ?? null,
      isDraft: false,
      validatedById: session.user.id,
      validatedAt: now,
    };

    const result = await prisma.$transaction(
      async (tx) => {
        const existingResult = await tx.labResult.findUnique({
          where: { orderItemId: orderItem.id },
        });

      const saved = existingResult
        ? await tx.labResult.update({
            where: { id: existingResult.id },
            data,
          })
        : await tx.labResult.create({
            data: { orderItemId: orderItem.id, ...data },
          });

      await tx.labResultItem.deleteMany({ where: { resultId: saved.id } });
      await tx.labResultItem.createMany({
        data: parsed.items.map((item) => ({
          resultId: saved.id,
          templateItemId:
            item.templateItemId && templateIds.has(item.templateItemId)
              ? item.templateItemId
              : null,
          paramNameSnapshot: item.paramNameSnapshot,
          unitSnapshot: item.unitSnapshot ?? null,
          refTextSnapshot: item.refTextSnapshot ?? null,
          refMinSnapshot: item.refMinSnapshot ?? null,
          refMaxSnapshot: item.refMaxSnapshot ?? null,
          value: item.value,
          isOutOfRange: item.isOutOfRange ?? false,
          isHighlighted: item.isHighlighted ?? false,
          order: item.order,
        })),
      });

      await tx.labOrderItem.update({
        where: { id: orderItem.id },
        data: { status: "COMPLETADO" },
      });

      const remaining = await tx.labOrderItem.count({
        where: { orderId: orderItem.orderId, status: { not: "COMPLETADO" } },
      });

      if (remaining === 0 && orderItem.order.status !== "ANULADO") {
        await tx.labOrder.update({
          where: { id: orderItem.orderId },
          data: { status: "COMPLETADO" },
        });
      }

      return saved;
    },
    { timeout: 15000 }
    );
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderItem.orderId}`);
    revalidatePath("/dashboard");

    return NextResponse.json({ item: result });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    return handleApiError(error, "Error al guardar resultado");
  }
}


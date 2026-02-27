import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { labTestSchema } from "@/features/lab/schemas";

import { getServerSession, hasPermission, PERMISSION_GESTIONAR_CATALOGO } from "@/lib/auth";
import { logger } from "@/lib/logger";

type PrismaErrorWithCode = { code?: string };

export async function GET(request: Request) {
  // GET puede ser público para ver catálogo de análisis
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();

    const activeOnly = searchParams.get("active") === "true";
    const items = await prisma.labTest.findMany({
      where: {
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { code: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: { section: true, referredLab: true },
      orderBy: [{ section: { order: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    logger.error("Error fetching tests:", error);
    return NextResponse.json(
      { error: "Error al obtener análisis" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSION_GESTIONAR_CATALOGO)) {
    return NextResponse.json({ error: "Sin permiso para crear análisis" }, { status: 403 });
  }

  try {
    const payload = await request.json();
    const parsed = labTestSchema.parse(payload);

    const item = await prisma.$transaction(async (tx) => {
      const test = await tx.labTest.create({
        data: {
          code: parsed.code,
          name: parsed.name,
          sectionId: parsed.sectionId,
          price: parsed.price,
          estimatedTimeMinutes: parsed.estimatedTimeMinutes ?? null,
          isActive: parsed.isActive ?? true,
          isReferred: parsed.isReferred ?? false,
          // Legacy: mantener un solo lab por test si se envía
          referredLabId: parsed.referredLabId ?? null,
          priceToAdmission: parsed.priceToAdmission ?? null,
          externalLabCost: parsed.externalLabCost ?? null,
        },
      });

      // Crear opciones de labs referidos si se enviaron
      const options = (parsed.referredLabOptions ?? []).filter(
        (opt) => opt.referredLabId,
      );
      if (options.length > 0) {
        const anyDefault = options.some((o) => o.isDefault);
        await tx.labTestReferredLab.createMany({
          data: options.map((opt, idx) => ({
            labTestId: test.id,
            referredLabId: opt.referredLabId!,
            priceToAdmission:
              opt.priceToAdmission ??
              parsed.priceToAdmission ??
              parsed.price ??
              0,
            externalLabCost: opt.externalLabCost ?? null,
            isDefault: anyDefault ? !!opt.isDefault : idx === 0,
          })),
        });
        // Alinear el campo legacy con la opción por defecto
        const defaultOpt =
          options.find((o) => o.isDefault) ?? options[0];
        await tx.labTest.update({
          where: { id: test.id },
          data: {
            referredLabId: defaultOpt.referredLabId!,
            priceToAdmission:
              defaultOpt.priceToAdmission ??
              parsed.priceToAdmission ??
              parsed.price ??
              0,
            externalLabCost: defaultOpt.externalLabCost ?? null,
            isReferred: true,
          },
        });
      }

      return tx.labTest.findUniqueOrThrow({
        where: { id: test.id },
        include: { section: true, referredLab: true },
      });
    });

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error creating test:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    // Prisma: clave única (por ejemplo, código de análisis duplicado)
    const prismaErr = error as PrismaErrorWithCode | null;
    if (prismaErr?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un análisis con ese código." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Error al crear análisis" },
      { status: 500 },
    );
  }
}

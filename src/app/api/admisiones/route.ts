import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { authOptions, hasPermission, PERMISSION_AJUSTAR_PRECIO_ADMISION, PERMISSION_GESTIONAR_ADMISION, PERMISSION_VER_ADMISION } from "@/lib/auth";
import { admissionCreateSchema } from "@/features/lab/schemas";
import { generateNextPatientCode } from "@/lib/patient-code";
import { parseDatePeru } from "@/lib/date";
import {
  admissionCodePrefixForDate,
  buildAdmissionCode,
  parseOrderCodeSequence,
} from "@/features/lab/order-utils";
import { convertAdmissionToOrder } from "@/features/lab/convert-admission-to-order";

type PrismaErrorWithCode = { code?: string };

function canViewOrManageAdmission(session: Awaited<ReturnType<typeof getServerSession>>) {
  return hasPermission(session ?? null, PERMISSION_VER_ADMISION) || hasPermission(session ?? null, PERMISSION_GESTIONAR_ADMISION);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canViewOrManageAdmission(session)) {
    return NextResponse.json({ error: "Sin permiso para ver admisiones" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const patientId = searchParams.get("patientId")?.trim() || "";

    const normalizedStatus =
      status === "PENDIENTE" || status === "CONVERTIDA" || status === "CANCELADA"
        ? status
        : "";
    const items = await prisma.admissionRequest.findMany({
      where: {
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
        ...(patientId ? { patientId } : {}),
        ...(search
          ? {
              OR: [
                { requestCode: { contains: search, mode: "insensitive" } },
                { patient: { dni: { contains: search, mode: "insensitive" } } },
                { patient: { firstName: { contains: search, mode: "insensitive" } } },
                { patient: { lastName: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        patient: true,
        branch: true,
        items: { include: { labTest: { include: { section: true } } }, orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json({ items });
  } catch (error) {
    logger.error("Error fetching admissions:", error);
    return NextResponse.json({ error: "Error al obtener admisiones" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSION_GESTIONAR_ADMISION)) {
    return NextResponse.json({ error: "Sin permiso para crear admisiones" }, { status: 403 });
  }

  const userExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!userExists) {
    return NextResponse.json(
      { error: "Sesión inválida: usuario no encontrado. Inicia sesión de nuevo." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parsed = admissionCreateSchema.parse(body);

    let patientId: string;
    if (parsed.patientId) {
      const existing = await prisma.patient.findFirst({
        where: { id: parsed.patientId, deletedAt: null },
      });
      if (!existing) {
        return NextResponse.json({ error: "Paciente no encontrado" }, { status: 400 });
      }
      patientId = existing.id;
    } else if (parsed.patientDraft) {
      const draft = parsed.patientDraft;
      const code = await generateNextPatientCode();
      const patient = await prisma.patient.create({
        data: {
          code,
          dni: draft.dni.trim(),
          firstName: draft.firstName.trim().toUpperCase(),
          lastName: draft.lastName.trim().toUpperCase(),
          birthDate: parseDatePeru(draft.birthDate),
          sex: draft.sex,
        },
      });
      patientId = patient.id;
    } else {
      return NextResponse.json({ error: "Se requiere patientId o patientDraft" }, { status: 400 });
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

    type AdmissionItemPayload = {
      test: TestWithTemplate;
      priceBase: number;
    };
    const itemPayload: AdmissionItemPayload[] = [];
    const fromProfileTestIds = new Set<string>();

    if (parsed.profileIds.length > 0) {
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
          profile.packagePrice != null ? Number(profile.packagePrice) / profileTests.length : null;
        for (const test of profileTests) {
          itemPayload.push({
            test,
            priceBase: priceEach ?? Number(test.price),
          });
          fromProfileTestIds.add(test.id);
        }
      }
    }

    const individualTestIds = parsed.tests.filter((id) => !fromProfileTestIds.has(id));
    if (individualTestIds.length > 0) {
      const individualTests = await prisma.labTest.findMany({
        where: { id: { in: individualTestIds }, deletedAt: null, isActive: true },
        include: fullInclude,
      });
      for (const test of individualTests) {
        itemPayload.push({ test, priceBase: Number(test.price) });
      }
    }

    if (itemPayload.length === 0) {
      return NextResponse.json({ error: "No hay análisis válidos" }, { status: 400 });
    }

    const canAdjust = hasPermission(session, PERMISSION_AJUSTAR_PRECIO_ADMISION);
    const adjustments = new Map(
      parsed.itemAdjustments.map((adj) => [adj.testId, { priceApplied: adj.priceApplied, reason: adj.adjustmentReason ?? null }]),
    );

    const itemsPrepared = itemPayload.map((item, index) => {
      const adjustment = adjustments.get(item.test.id);
      const priceApplied = adjustment?.priceApplied ?? item.priceBase;
      if (!canAdjust && Math.abs(priceApplied - item.priceBase) > 0.0001) {
        throw new Error("NO_PERMISSION_ADJUSTMENT");
      }
      return {
        labTestId: item.test.id,
        order: index,
        priceBase: item.priceBase,
        priceApplied,
        adjustmentReason: adjustment?.reason ?? null,
      };
    });

    const totalPrice = itemsPrepared.reduce((acc, item) => acc + item.priceApplied, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const prefix = admissionCodePrefixForDate(todayStart);

    let admission: Awaited<ReturnType<typeof prisma.admissionRequest.create>>;
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await prisma.admissionRequest.findMany({
        where: { requestCode: { startsWith: prefix } },
        select: { requestCode: true },
      });
      const maxSeq = Math.max(0, ...existing.map((row) => parseOrderCodeSequence(row.requestCode)));
      const requestCode = buildAdmissionCode(maxSeq + 1, todayStart);

      try {
        admission = await prisma.admissionRequest.create({
          data: {
            requestCode,
            patientId,
            requestedBy: parsed.requestedBy ?? null,
            notes: parsed.notes ?? null,
            patientType: parsed.patientType ?? null,
            branchId: parsed.branchId ?? null,
            status: "PENDIENTE",
            totalPrice,
            createdById: session.user.id ?? null,
            items: { createMany: { data: itemsPrepared } },
          },
          include: {
            patient: true,
            branch: true,
            items: { include: { labTest: true }, orderBy: { order: "asc" } },
          },
        });

        // Conversión automática: crear orden de laboratorio y marcar pre-orden como convertida
        let convertedOrder: { orderId: string; orderCode: string } | null = null;
        try {
          convertedOrder = await convertAdmissionToOrder(admission.id);
        } catch (convertErr) {
          logger.error("Error en conversión automática de pre-orden a orden:", convertErr);
          // La pre-orden ya quedó creada; el usuario puede convertirla manualmente desde la bandeja
        }

        return NextResponse.json(
          {
            item: admission,
            convertedOrder: convertedOrder ?? undefined,
          },
          { status: 201 },
        );
      } catch (err) {
        const isUnique =
          err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002";
        if (isUnique && attempt < 2) continue;
        throw err;
      }
    }

    return NextResponse.json({ error: "No se pudo generar el código de admisión" }, { status: 500 });
  } catch (error) {
    logger.error("Error creating admission:", error);
    if (error instanceof Error && error.message === "NO_PERMISSION_ADJUSTMENT") {
      return NextResponse.json(
        { error: "No tienes permiso para ajustar precios puntuales en admisión" },
        { status: 403 },
      );
    }
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: error }, { status: 400 });
    }
    const prismaErr = error as PrismaErrorWithCode | null;
    if (prismaErr?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un paciente con ese DNI." }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear la pre-orden de admisión" }, { status: 500 });
  }
}

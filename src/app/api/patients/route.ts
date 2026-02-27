import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/features/lab/schemas";
import { generateNextPatientCode } from "@/lib/patient-code";
import { parseDateTimePeru, parseDatePeru } from "@/lib/date";

import { getServerSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

type PrismaErrorWithCode = { code?: string };

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();

    const items = await prisma.patient.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { dni: { contains: search } },
                { code: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { code: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    logger.error("Error fetching patients:", error);
    return NextResponse.json(
      { error: "Error al obtener pacientes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = patientSchema.parse(payload);

    const firstName = parsed.firstName.trim().toUpperCase();
    const lastName = parsed.lastName.trim().toUpperCase();

    let item: Awaited<ReturnType<typeof prisma.patient.create>> | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = await generateNextPatientCode();
      const dniVal = parsed.dni && String(parsed.dni).trim() ? String(parsed.dni).trim() : undefined;
      const createData: Parameters<typeof prisma.patient.create>[0]["data"] = {
        code,
        ...(dniVal != null ? { dni: dniVal } : {}),
        firstName,
        lastName,
        birthDate: parseDatePeru(parsed.birthDate),
        sex: parsed.sex,
        phone: parsed.phone || null,
        address: parsed.address || null,
        email: parsed.email || null,
      };
      if (parsed.createdAt && parsed.createdAt.trim()) {
        createData.createdAt = parseDateTimePeru(parsed.createdAt);
      }
      try {
        item = await prisma.patient.create({ data: createData });
        break;
      } catch (err) {
        const prismaErr = err as { code?: string; meta?: { target?: string[] } };
        if (prismaErr?.code === "P2002" && prismaErr?.meta?.target?.includes("code")) {
          if (attempt < 2) continue;
        }
        throw err;
      }
    }

    if (!item) {
      return NextResponse.json({ error: "No se pudo generar el código de paciente." }, { status: 500 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Error creating patient:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    // Prisma: clave única (DNI o código duplicado)
    const prismaErr = error as PrismaErrorWithCode & { meta?: { target?: string[] } } | null;
    if (prismaErr?.code === "P2002") {
      const target = prismaErr.meta?.target ?? [];
      if (target.includes("dni")) {
        return NextResponse.json(
          { error: "Ya existe un paciente registrado con ese DNI." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Error al generar código único. Intente guardar de nuevo." },
        { status: 409 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Error al crear paciente";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

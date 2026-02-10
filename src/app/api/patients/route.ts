import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/features/lab/schemas";
import { generateNextPatientCode } from "@/lib/patient-code";

export async function GET(request: Request) {
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { error: "Error al obtener pacientes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = patientSchema.parse(payload);

    const code = await generateNextPatientCode();
    const firstName = parsed.firstName.trim().toUpperCase();
    const lastName = parsed.lastName.trim().toUpperCase();

    const item = await prisma.patient.create({
      data: {
        code,
        dni: parsed.dni.trim(),
        firstName,
        lastName,
        birthDate: new Date(parsed.birthDate),
        sex: parsed.sex,
        phone: parsed.phone || null,
        address: parsed.address || null,
        email: parsed.email || null,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error creating patient:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }
    // Prisma: clave única (por ejemplo, DNI duplicado)
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as any).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un paciente registrado con ese DNI." },
        { status: 409 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Error al crear paciente";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

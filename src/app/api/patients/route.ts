import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/features/lab/schemas";

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

    const item = await prisma.patient.create({
      data: {
        ...parsed,
        birthDate: new Date(parsed.birthDate),
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
    return NextResponse.json(
      { error: "Error al crear paciente" },
      { status: 500 },
    );
  }
}

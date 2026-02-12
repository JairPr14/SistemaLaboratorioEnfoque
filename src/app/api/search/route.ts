import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";

const MAX_QUERY_LENGTH = 100;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 100;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    // Validación de entrada
    if (!q) {
      return NextResponse.json({ patients: [], orders: [] });
    }

    if (q.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `La búsqueda debe tener al menos ${MIN_QUERY_LENGTH} caracteres` },
        { status: 400 },
      );
    }

    if (q.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `La búsqueda no puede exceder ${MAX_QUERY_LENGTH} caracteres` },
        { status: 400 },
      );
    }

    // Sanitizar query: remover caracteres peligrosos y limitar longitud
    const sanitizedQuery = q
      .slice(0, MAX_QUERY_LENGTH)
      .replace(/[<>\"'%;()&+]/g, "")
      .trim();

    if (sanitizedQuery.length < MIN_QUERY_LENGTH) {
      return NextResponse.json({ patients: [], orders: [] });
    }

    // Usar Prisma queries en lugar de raw queries para mayor seguridad
    const searchPattern = {
      contains: sanitizedQuery,
      mode: "insensitive" as const,
    };

    const [patients, orders] = await Promise.all([
      prisma.patient.findMany({
        where: {
          deletedAt: null,
          OR: [
            { firstName: searchPattern },
            { lastName: searchPattern },
            { dni: searchPattern },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dni: true,
        },
        take: Math.min(MAX_RESULTS, 50), // Límite de resultados
        orderBy: { createdAt: "desc" },
      }),
      prisma.labOrder.findMany({
        where: {
          orderCode: searchPattern,
        },
        select: {
          id: true,
          orderCode: true,
        },
        take: Math.min(MAX_RESULTS, 50), // Límite de resultados
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      patients: patients.map((p) => ({
        id: p.id,
        type: "patient",
        label: `${p.lastName} ${p.firstName}`,
        sublabel: p.dni,
        href: `/patients/${p.id}`,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        type: "order",
        label: o.orderCode,
        sublabel: "Orden",
        href: `/orders/${o.id}`,
      })),
    });
  } catch (error) {
    logger.error("Error in search:", error);
    return NextResponse.json(
      { error: "Error al realizar la búsqueda" },
      { status: 500 },
    );
  }
}

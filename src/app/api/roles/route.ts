import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { code: "asc" },
      include: { _count: { select: { users: true } } },
    });
    return NextResponse.json({ items: roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Error al obtener roles" },
      { status: 500 },
    );
  }
}

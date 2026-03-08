/**
 * API unificada para página Promociones: tests + profiles en 1 petición.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";
import { mapTestProfile, testProfileIncludeItems } from "@/lib/test-profiles";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { items, profiles } = await withDbRetry(async () => {
      const testsRes = await prisma.labTest.findMany({
        where: { deletedAt: null, isActive: true },
        include: { section: true },
        orderBy: [{ section: { order: "asc" } }, { name: "asc" }],
      });
      const profilesRes = await prisma.testProfile.findMany({
        where: { isActive: true },
        include: testProfileIncludeItems,
        orderBy: { name: "asc" },
      });

      const items = testsRes.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        section: t.section?.code ?? t.section?.name ?? "",
        price: Number(t.price),
      }));

      return {
        items,
        profiles: profilesRes.map((p) => mapTestProfile(p)),
      };
    });

    const res = NextResponse.json({ items, profiles });
    res.headers.set("Cache-Control", "private, max-age=30");
    return res;
  } catch (error) {
    logger.error("Error fetching promociones-data:", error);
    return NextResponse.json(
      { error: "Error al cargar datos" },
      { status: 500 },
    );
  }
}

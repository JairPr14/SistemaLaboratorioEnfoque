/**
 * API unificada para QuickOrderModal: tests + profiles + favorites en 1 petición.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";
import { getServerSession } from "@/lib/auth";
import { mapTestProfile, testProfileIncludeItems } from "@/lib/test-profiles";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { items: testsRaw, profiles, testIds } = await withDbRetry(async () => {
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
      const favsRes = session.user?.id
        ? await prisma.userFavoriteTest.findMany({
            where: { userId: session.user.id },
            select: { labTestId: true },
          })
        : [];

      const items = testsRes.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        section: t.section?.code ?? "",
        price: Number(t.price),
      }));
      const testIdsArr = Array.isArray(favsRes) ? favsRes.map((f) => f.labTestId) : [];

      return {
        items: items,
        profiles: profilesRes.map((p) => mapTestProfile(p)),
        testIds: testIdsArr,
      };
    });

    const res = NextResponse.json({
      items: testsRaw,
      profiles,
      testIds,
    });
    res.headers.set("Cache-Control", "private, max-age=30");
    return res;
  } catch (error) {
    logger.error("Error fetching quick-data:", error);
    return NextResponse.json(
      { error: "Error al cargar datos" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSlaLevel } from "@/lib/time-utils";
import {
  getOrderWorklistAlerts,
  getTestAlerts,
  sortByRiskAndAge,
} from "@/features/lab/worklist-rules";
import { getServerSession } from "next-auth";
import { logger } from "@/lib/logger";
import { authOptions } from "@/lib/auth";

const SECTION_MAP: Record<string, string> = {
  BIOQUIMICA: "BIOQUIMICA",
  HEMATOLOGIA: "HEMATOLOGIA",
  INMUNOLOGIA: "INMUNOLOGIA",
  ORINA: "ORINA",
  HECES: "HECES",
  OTROS: "OTROS",
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sectionParam = searchParams.get("section")?.toUpperCase();
    const range = searchParams.get("range") || "7d";

    const section =
      sectionParam && SECTION_MAP[sectionParam] ? sectionParam : null;

    const since = new Date();
    if (range === "today") {
      since.setHours(0, 0, 0, 0);
    } else if (range === "7d") {
      since.setDate(since.getDate() - 7);
    } else if (range === "30d") {
      since.setDate(since.getDate() - 30);
    }

    const orders = await prisma.labOrder.findMany({
      where: {
        status: { in: ["PENDIENTE", "EN_PROCESO", "COMPLETADO"] },
        createdAt: { gte: since },
        ...(section
          ? {
              items: {
                some: { labTest: { section: section as "BIOQUIMICA" | "HEMATOLOGIA" | "INMUNOLOGIA" | "ORINA" | "HECES" | "OTROS" } },
              },
            }
          : {}),
      },
      select: {
        id: true,
        orderCode: true,
        createdAt: true,
        status: true,
        patient: { select: { firstName: true, lastName: true } },
        items: {
          select: {
            id: true,
            status: true,
            labTestId: true,
            labTest: { select: { code: true, name: true, section: true } },
            result: {
              select: {
                items: {
                  select: { value: true, isOutOfRange: true },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const rows = orders.map((order) => {
      const itemsInSection = section
        ? order.items.filter((i) => i.labTest.section === section)
        : order.items;

      const totalTests = order.items.length;
      const completedTests = order.items.filter(
        (i) => i.status === "COMPLETADO"
      ).length;
      const slaLevel = getSlaLevel(order.createdAt);

      const orderAlerts = getOrderWorklistAlerts({
        status: order.status,
        createdAt: order.createdAt,
        totalTests,
        completedTests,
      });

      const tests = itemsInSection.map((item) => {
        const resultItems = item.result?.items ?? [];
        const isComplete = item.status === "COMPLETADO";
        const missingCount = isComplete ? 0 : 1;
        const alerts = getTestAlerts({
          testCode: item.labTest.code,
          testName: item.labTest.name,
          resultItems,
        });

        return {
          testId: item.id,
          name: item.labTest.name,
          code: item.labTest.code,
          isComplete,
          missingCount,
          alerts,
        };
      });

      const hasPending = tests.some((t) => !t.isComplete);
      if (!hasPending && section) return null;

      return {
        orderId: order.id,
        code: order.orderCode,
        patientName: `${order.patient.lastName} ${order.patient.firstName}`,
        createdAt: order.createdAt,
        status: order.status,
        section: section ?? itemsInSection[0]?.labTest.section ?? "OTROS",
        tests,
        orderAlerts,
        slaLevel,
      };
    });

    const filtered = rows.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );

    const sorted = sortByRiskAndAge(filtered);

    return NextResponse.json({ items: sorted });
  } catch (error) {
    logger.error("Error fetching worklist:", error);
    return NextResponse.json(
      { error: "Error al obtener worklist" },
      { status: 500 }
    );
  }
}

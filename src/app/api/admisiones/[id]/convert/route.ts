import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { logger } from "@/lib/logger";
import { authOptions, hasPermission, PERMISSION_CONVERTIR_ADMISION_A_ORDEN } from "@/lib/auth";
import { convertAdmissionToOrder } from "@/features/lab/convert-admission-to-order";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!hasPermission(session, PERMISSION_CONVERTIR_ADMISION_A_ORDEN)) {
    return NextResponse.json({ error: "Sin permiso para convertir pre-órdenes" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const { orderId, orderCode } = await convertAdmissionToOrder(id);
    return NextResponse.json({
      item: { id: orderId, orderCode },
      redirectTo: `/orders/${orderId}`,
    });
  } catch (error) {
    logger.error("Error converting admission to order:", error);
    if (error instanceof Error) {
      if (error.message === "ADMISSION_NOT_FOUND") {
        return NextResponse.json({ error: "Pre-orden no encontrada" }, { status: 404 });
      }
      if (error.message === "ADMISSION_NOT_PENDING") {
        return NextResponse.json({ error: "La pre-orden no está disponible para conversión" }, { status: 400 });
      }
      if (error.message === "ADMISSION_ALREADY_CONVERTED") {
        return NextResponse.json({ error: "La pre-orden ya fue convertida" }, { status: 409 });
      }
      if (error.message === "ADMISSION_NO_ITEMS") {
        return NextResponse.json({ error: "La pre-orden no tiene análisis" }, { status: 400 });
      }
      if (error.message.startsWith("ANALYSIS_NOT_AVAILABLE:")) {
        return NextResponse.json(
          { error: "Uno o más análisis de la pre-orden ya no están disponibles en catálogo." },
          { status: 400 },
        );
      }
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "La pre-orden ya fue convertida por otro usuario." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Error al convertir la pre-orden" }, { status: 500 });
  }
}

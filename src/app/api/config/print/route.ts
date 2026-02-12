import { NextResponse } from "next/server";
import { getPrintConfig, updatePrintConfig } from "@/lib/print-config";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const config = await getPrintConfig();
    return NextResponse.json(config);
  } catch (error) {
    logger.error("Error fetching print config:", error);
    return NextResponse.json(
      { error: "Error al obtener la configuración" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { stampEnabled, stampImageUrl } = body as {
      stampEnabled?: boolean;
      stampImageUrl?: string | null;
    };

    const config = await updatePrintConfig({
      ...(typeof stampEnabled === "boolean" && { stampEnabled }),
      ...(stampImageUrl !== undefined && { stampImageUrl }),
    });

    return NextResponse.json(config);
  } catch (error) {
    logger.error("Error updating print config:", error);
    return NextResponse.json(
      { error: "Error al actualizar la configuración" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { generateNextPatientCode } from "@/lib/patient-code";

import { getServerSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const code = await generateNextPatientCode();
    return NextResponse.json({ code });
  } catch (error) {
    logger.error("Error getting next patient code:", error);
    return NextResponse.json(
      { error: "Error al obtener el próximo código" },
      { status: 500 },
    );
  }
}

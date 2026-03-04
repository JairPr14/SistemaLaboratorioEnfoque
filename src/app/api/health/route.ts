import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health check endpoint para monitoreo
 * Verifica que la aplicación y la base de datos estén funcionando
 */
export async function GET() {
  try {
    // Verificar conexión a la base de datos
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        database: "connected",
      },
      { status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: process.env.NODE_ENV === "development" ? msg : undefined,
        hint: process.env.NODE_ENV === "production" ? (msg.toLowerCase().includes("ssl") ? "SSL requerido" : msg.includes("ECONNREFUSED") ? "Conexión rechazada" : msg.includes("ENOTFOUND") ? "Host no encontrado" : "Revisar DATABASE_URL") : undefined,
      },
      { status: 503 },
    );
  }
}

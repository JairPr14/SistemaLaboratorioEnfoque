import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logger } from "./logger";

/**
 * Maneja errores de API de forma estandarizada
 */
export function handleApiError(error: unknown, defaultMessage: string): NextResponse {
  // Errores de validación Zod
  if (error instanceof ZodError) {
    return NextResponse.json(
      { 
        error: "Datos inválidos",
        details: error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 },
    );
  }

  // Errores de Prisma
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return NextResponse.json(
          { error: "Ya existe un registro con estos datos únicos" },
          { status: 409 },
        );
      case "P2025":
        return NextResponse.json(
          { error: "Registro no encontrado" },
          { status: 404 },
        );
      case "P2003":
        return NextResponse.json(
          { error: "Referencia a registro inexistente" },
          { status: 400 },
        );
      default:
        logger.error("Prisma error:", error);
        return NextResponse.json(
          { error: defaultMessage },
          { status: 500 },
        );
    }
  }

  // Errores genéricos
  if (error instanceof Error) {
    // Errores de "no encontrado" comunes
    if (error.message.includes("not found") || error.message.includes("no encontrado")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    // Errores de validación
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 },
      );
    }

    logger.error("API error:", error);
    return NextResponse.json(
      { error: error.message || defaultMessage },
      { status: 500 },
    );
  }

  // Error desconocido
  logger.error("Unknown error:", error);
  return NextResponse.json(
    { error: defaultMessage },
    { status: 500 },
  );
}

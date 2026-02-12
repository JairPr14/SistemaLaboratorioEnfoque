import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { updatePrintConfig } from "@/lib/print-config";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB (aumentado según el plan)

// Magic bytes para validar contenido real del archivo
const MAGIC_BYTES = {
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
  jpeg: [0xff, 0xd8, 0xff], // JPEG
  webp: [0x52, 0x49, 0x46, 0x46], // WebP (RIFF header, necesita más validación)
} as const;

/**
 * Valida que el buffer contenga realmente una imagen válida usando magic bytes
 */
function validateImageContent(buffer: Buffer, expectedType: string): boolean {
  if (buffer.length < 8) return false;

  // Validar PNG
  if (expectedType.includes("png")) {
    return MAGIC_BYTES.png.every((byte, index) => buffer[index] === byte);
  }

  // Validar JPEG
  if (expectedType.includes("jpeg") || expectedType.includes("jpg")) {
    return MAGIC_BYTES.jpeg.every((byte, index) => buffer[index] === byte);
  }

  // Validar WebP (RIFF...WEBP)
  if (expectedType.includes("webp")) {
    const hasRiff = MAGIC_BYTES.webp.every((byte, index) => buffer[index] === byte);
    if (!hasRiff) return false;
    // Verificar que después de RIFF viene WEBP (posición 8-11)
    const webpSignature = buffer.slice(8, 12).toString("ascii");
    return webpSignature === "WEBP";
  }

  return false;
}

/**
 * Sanitiza el nombre de archivo para prevenir path traversal
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.\./g, "_")
    .substring(0, 255);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("stamp") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Debe subir un archivo de imagen" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato no válido. Use PNG, JPG o WebP." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `La imagen no debe superar ${MAX_SIZE / 1024 / 1024} MB` },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "El archivo está vacío" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validar contenido real del archivo usando magic bytes
    if (!validateImageContent(buffer, file.type)) {
      return NextResponse.json(
        { error: "El archivo no es una imagen válida. El contenido no coincide con el tipo declarado." },
        { status: 400 },
      );
    }

    const publicDir = path.join(process.cwd(), "public");
    const stampPath = path.join(publicDir, "stamp.png");

    await writeFile(stampPath, buffer);

    await updatePrintConfig({
      stampImageUrl: "/stamp.png",
    });

    return NextResponse.json({
      stampImageUrl: "/stamp.png",
      message: "Sello subido correctamente",
    });
  } catch (error) {
    logger.error("Error uploading stamp:", error);
    return NextResponse.json(
      { error: "Error al subir el sello" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { getServerSession, hasPermission, PERMISSION_GESTIONAR_CATALOGO, PERMISSION_GESTIONAR_LAB_REFERIDOS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const MAGIC_BYTES = {
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpeg: [0xff, 0xd8, 0xff],
  webp: [0x52, 0x49, 0x46, 0x46],
} as const;

function validateImageContent(buffer: Buffer, expectedType: string): boolean {
  if (buffer.length < 8) return false;
  if (expectedType.includes("png")) {
    return MAGIC_BYTES.png.every((byte, index) => buffer[index] === byte);
  }
  if (expectedType.includes("jpeg") || expectedType.includes("jpg")) {
    return MAGIC_BYTES.jpeg.every((byte, index) => buffer[index] === byte);
  }
  if (expectedType.includes("webp")) {
    const hasRiff = MAGIC_BYTES.webp.every((byte, index) => buffer[index] === byte);
    if (!hasRiff) return false;
    return buffer.slice(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const canManage =
    hasPermission(session, PERMISSION_GESTIONAR_CATALOGO) || hasPermission(session, PERMISSION_GESTIONAR_LAB_REFERIDOS);
  if (!canManage) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const lab = await prisma.referredLab.findUnique({ where: { id } });
    if (!lab) {
      return NextResponse.json({ error: "Laboratorio referido no encontrado" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "logo" | "stamp"

    if (!file || !(file instanceof File) || !type || !["logo", "stamp"].includes(type)) {
      return NextResponse.json(
        { error: "Debe enviar un archivo y el tipo (logo o stamp)" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato no válido. Use PNG, JPG o WebP." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE || file.size === 0) {
      return NextResponse.json(
        { error: "El archivo debe ser válido y no superar 5 MB" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (!validateImageContent(buffer, file.type)) {
      return NextResponse.json(
        { error: "El archivo no es una imagen válida." },
        { status: 400 },
      );
    }

    const key = `referred-lab:${id}:${type}`;
    await prisma.storedImage.upsert({
      where: { key },
      create: { key, mimeType: file.type, data: buffer },
      update: { mimeType: file.type, data: buffer },
    });

    const url = `/api/images/referred-lab/${id}/${type}`;
    const updateData = type === "logo" ? { logoUrl: url } : { stampImageUrl: url };
    await prisma.referredLab.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      [type === "logo" ? "logoUrl" : "stampImageUrl"]: url,
      message: `${type === "logo" ? "Logo" : "Sello"} subido correctamente`,
    });
  } catch (error) {
    logger.error("Error uploading referred lab image:", error);
    return NextResponse.json(
      { error: "Error al subir la imagen" },
      { status: 500 },
    );
  }
}

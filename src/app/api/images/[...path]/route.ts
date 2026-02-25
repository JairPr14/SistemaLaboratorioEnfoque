import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Sirve imágenes almacenadas en BD.
 * Rutas: /api/images/print_stamp | /api/images/referred-lab/[id]/logo | /api/images/referred-lab/[id]/stamp
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  if (!pathSegments?.length) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }

  const key = pathSegments.join(":");

  try {
    const img = await prisma.storedImage.findUnique({
      where: { key },
    });

    if (!img) {
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }

    const buffer = Buffer.from(img.data);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": img.mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al cargar la imagen" }, { status: 500 });
  }
}

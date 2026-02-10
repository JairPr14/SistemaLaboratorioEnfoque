import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { updatePrintConfig } from "@/lib/print-config";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: Request) {
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
        { error: "La imagen no debe superar 2 MB" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

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
    console.error("Error uploading stamp:", error);
    return NextResponse.json(
      { error: "Error al subir el sello" },
      { status: 500 },
    );
  }
}

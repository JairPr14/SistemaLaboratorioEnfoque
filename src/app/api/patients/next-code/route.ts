import { NextResponse } from "next/server";
import { generateNextPatientCode } from "@/lib/patient-code";

export async function GET() {
  try {
    const code = await generateNextPatientCode();
    return NextResponse.json({ code });
  } catch (error) {
    console.error("Error getting next patient code:", error);
    return NextResponse.json(
      { error: "Error al obtener el próximo código" },
      { status: 500 },
    );
  }
}

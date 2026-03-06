import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

const handler = NextAuth(authOptions);

async function wrappedHandler(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  try {
    return await handler(req, context);
  } catch (error) {
    console.error("[NextAuth]", error);
    return NextResponse.json(
      { error: "Auth error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export { wrappedHandler as GET, wrappedHandler as POST };

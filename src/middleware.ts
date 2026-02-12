import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const publicPaths = ["/login"];
const authApiPrefix = "/api/auth";

/**
 * Obtiene el identificador único para rate limiting (IP address)
 */
function getRateLimitIdentifier(request: NextRequest): string {
  // Intentar obtener IP real desde headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  // Fallback a una IP genérica si no se puede determinar
  return request.ip || "unknown";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting para rutas críticas
  if (pathname.startsWith("/api/auth/callback/credentials")) {
    // Login endpoint
    const identifier = getRateLimitIdentifier(request);
    const result = checkRateLimit(`login:${identifier}`, RATE_LIMITS.login);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Demasiados intentos de inicio de sesión. Intente más tarde.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.resetTime - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(RATE_LIMITS.login.maxRequests),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.resetTime),
          },
        },
      );
    }
  }

  if (pathname.startsWith("/api/orders") && request.method === "POST") {
    // Creación de órdenes
    const identifier = getRateLimitIdentifier(request);
    const result = checkRateLimit(`order:${identifier}`, RATE_LIMITS.createOrder);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Demasiadas solicitudes. Intente más tarde.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.resetTime - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(RATE_LIMITS.createOrder.maxRequests),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.resetTime),
          },
        },
      );
    }
  }

  if (pathname.startsWith("/api/search")) {
    // Búsqueda
    const identifier = getRateLimitIdentifier(request);
    const result = checkRateLimit(`search:${identifier}`, RATE_LIMITS.search);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Demasiadas búsquedas. Intente más tarde.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.resetTime - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(RATE_LIMITS.search.maxRequests),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.resetTime),
          },
        },
      );
    }
  }

  // Rutas públicas y assets
  if (pathname.startsWith(authApiPrefix) || publicPaths.includes(pathname)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Verificación de autenticación
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

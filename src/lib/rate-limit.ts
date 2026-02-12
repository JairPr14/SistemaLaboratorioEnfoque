/**
 * Sistema de rate limiting básico usando memoria
 * Para producción, considera usar Redis o un servicio externo
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Verifica si una IP ha excedido el límite de solicitudes
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Si no hay entrada o la ventana expiró, crear nueva
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Si ya alcanzó el límite
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Incrementar contador
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Configuraciones predefinidas para diferentes rutas
 */
export const RATE_LIMITS = {
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
  },
  createOrder: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hora
  },
  search: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
  },
  default: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
  },
} as const;

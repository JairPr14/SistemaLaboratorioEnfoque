/**
 * Reintenta operaciones de BD que fallan por "too many connections".
 * Útil cuando Seenode/Neon tiene límite bajo: en vez de fallar, espera y reintenta.
 */
const CONNECTION_ERROR_PATTERNS = [
  "too many connections",
  "too many database connections",
  "connection limit exceeded",
  "remaining connection slots",
];

function isConnectionLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return CONNECTION_ERROR_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Ejecuta una operación de BD y reintenta hasta `maxRetries` veces si falla por límite de conexiones.
 * Espera entre reintentos (1s, 2s, 3s...) para dar tiempo a que se liberen conexiones.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; baseDelayMs?: number }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && isConnectionLimitError(err)) {
        const delay = baseDelayMs * (attempt + 1);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

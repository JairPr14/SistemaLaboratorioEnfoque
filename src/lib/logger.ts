/**
 * Sistema de logging condicional
 * Solo loguea en desarrollo, excepto errores críticos que siempre se registran
 */

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Log normal (solo en desarrollo)
 */
export function log(...args: unknown[]): void {
  if (isDevelopment) {
    console.log(...args);
  }
}

/**
 * Log de información (solo en desarrollo)
 */
export function logInfo(...args: unknown[]): void {
  if (isDevelopment) {
    console.info(...args);
  }
}

/**
 * Log de advertencia (solo en desarrollo)
 */
export function logWarn(...args: unknown[]): void {
  if (isDevelopment) {
    console.warn(...args);
  }
}

/**
 * Log de error (siempre activo, crítico para producción)
 * Los errores siempre deben registrarse para debugging y monitoreo
 */
export function logError(...args: unknown[]): void {
  console.error(...args);
}

/**
 * Logger con contexto (útil para APIs)
 */
export const logger = {
  log,
  info: logInfo,
  warn: logWarn,
  error: logError,
};

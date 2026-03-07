/**
 * Instrumentation vacía para evitar abrir conexiones extra a la BD en cada cold start.
 * Las columnas validatedById/validatedAt se añaden con prisma migrate deploy.
 * Abrir un PrismaClient aquí saturaba Seenode ("too many connections").
 */
export async function register() {
  // Sin conexiones a BD en arranque
}

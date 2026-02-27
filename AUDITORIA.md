# Auditoría del Proyecto - Sistema Laboratorio Enfoque

Documento de auditoría realizado para identificar redundancias, puntos ciegos y código poco entendible.

## Cambios implementados

### 1. Unificación de `getServerSession`
- **Problema:** Mezcla de `getServerSession(authOptions)` de `next-auth` y el wrapper de `@/lib/auth`.
- **Solución:** Todas las páginas y rutas API ahora usan `getServerSession()` desde `@/lib/auth` (sin pasar `authOptions`).
- **Archivos afectados:** ~40 archivos entre páginas y rutas API.

### 2. Eliminación de `parseLocalDate` duplicado
- **Problema:** `parseLocalDate` estaba duplicado en `reportes-utils.ts` y `api/reportes/export/route.ts`.
- **Solución:** La ruta de exportación ahora usa `parseLocalDate` de `@/lib/date` (con parámetro `endOfDay`).
- **Nota:** `reportes-utils.ts` mantiene su propia `parseLocalDate` porque usa una firma distinta (`SearchParams`) y es consumida por páginas de reportes.

### 3. Proxy / Middleware (Next.js 16)
- **Nota:** En Next.js 16, `proxy.ts` reemplaza a `middleware.ts`. El proyecto ya usa `src/proxy.ts` correctamente para autenticación, rate limiting y redirección a login. No se requiere `middleware.ts`.

### 4. Función `toPatientSelectOption`
- **Problema:** Mapeo de pacientes a opciones de select duplicado en `admission/nueva` y `orders/new`.
- **Solución:** Nueva función `toPatientSelectOption` en `@/lib/format.ts` centraliza el formato de etiqueta con DNI.

---

## Pendientes (no implementados)

### APIs sin validación de permisos
Varias APIs validan sesión pero no verifican permisos específicos. Considerar usar `requirePermission()` o `requireAnyPermission()` en:
- `/api/search` – búsqueda general
- `/api/patients` – listado y creación
- `/api/notifications`
- Otras rutas que acceden a datos sensibles

### Unificación de nombres
- **admission vs admisiones:** Algunos componentes usan `admission/`, otros referencian "admisiones" en texto. Mantener coherencia de nomenclatura.

### `handleApiError` infrautilizado
- El módulo `@/lib/api-errors` define `handleApiError` para errores Zod/Prisma, pero no todas las APIs lo usan. Evaluar adopción para respuestas de error consistentes.

### Layout (app) y sesión
- El layout `(app)` no valida sesión explícitamente; el middleware ya redirige a login. La validación en layout sería redundante pero podría usarse para UX (ej. mostrar estado de carga).

---

## Estructura de autenticación

1. **Middleware** (`src/middleware.ts`): Rate limiting, rutas públicas, verificación de JWT con `getToken`. Redirige a `/login` si no hay token.
2. **Páginas:** Usan `getServerSession()` de `@/lib/auth` y `hasPermission()` para control de acceso por ruta.
3. **APIs:** Usan `getServerSession()` o `requirePermission()` para validar sesión y permisos.

# Configuración de Vercel + Seenode

Este proyecto usa **Seenode** como base de datos en producción. Sigue estos pasos para que la app funcione en Vercel.

## Variables de entorno en Vercel

1. Ve a [vercel.com](https://vercel.com) → tu proyecto → **Settings** → **Environment Variables**
2. Configura estas variables:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `DATABASE_URL` | Tu connection string de Seenode (copiada del panel de Seenode) | Production, Preview, Development |
| `DIRECT_URL` | **Igual que DATABASE_URL** (Seenode no tiene pooler separado) | Production, Preview, Development |
| `NEXTAUTH_URL` | La URL real de tu app, ej: `https://sistema-laboratorio-enfoque.vercel.app` | Production, Preview, Development |
| `NEXTAUTH_SECRET` | Una clave secreta (usa la misma que en desarrollo) | Production, Preview, Development |

## Aplicar migraciones a Seenode

Antes de usar la app, debes aplicar el esquema a la base de datos de Seenode:

```bash
# Con DATABASE_URL y DIRECT_URL apuntando a Seenode (o inline):
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." pnpm prisma migrate deploy
```

> **Nota:** `DIRECT_URL` debe ser igual a `DATABASE_URL` en Seenode (no hay pooler separado). Para migraciones locales, añade `DIRECT_URL` a tu `.env` con el mismo valor que `DATABASE_URL`.

O temporalmente cambia `DATABASE_URL` en `.env` a Seenode, ejecuta `pnpm prisma migrate deploy`, y luego vuelve a poner Docker para desarrollo local.

## Obtener DATABASE_URL de Seenode

1. Entra a tu panel de Seenode
2. Selecciona tu base de datos
3. Pestaña **Connection** → copia el **Connection string** de PostgreSQL
4. Formato: `postgresql://usuario:contraseña@host:puerto/nombre_bd`

## NEXTAUTH_URL debe coincidir

- Si tu app está en `https://sistema-laboratorio-enfoque-xxx.vercel.app`, usa esa URL exacta
- Si usas dominio personalizado, usa ese dominio
- **No** uses `http://localhost:3000` en producción

## Después de cambiar variables

1. Guarda las variables
2. Ve a **Deployments** → **Redeploy** en el último deployment
3. O haz un nuevo push a tu repositorio

## Probar la conexión

Visita `https://TU-DOMINIO.vercel.app/api/health`:

- Si responde `{ "database": "connected" }` → la base de datos está bien
- Si responde `{ "database": "disconnected" }` o error 503 → hay un problema con `DATABASE_URL`

## Si sigue el error

1. **Prueba `/api/health`** para ver si la BD conecta
2. Revisa **Deployments** → tu deployment → **View Function Logs** para ver el error real
3. Verifica que Seenode permita conexiones externas (sin restricción de IP)
4. Asegúrate de que la base de datos en Seenode esté en ejecución
5. La app ya añade `sslmode=require` automáticamente para Seenode (no hace falta ponerlo en la URL)

## Concurrencia: 3 usuarios a la vez

El sistema está preparado para **al menos 3 usuarios concurrentes** sin saturarse:

- **Conexiones a la BD:** Cada instancia de la app en Vercel usa 1 conexión a Seenode por defecto. Con 3 personas usando la app a la vez, se abren como máximo 3 conexiones por 3 instancias activas. Tu plan de **Seenode debe permitir al menos 3 conexiones** (revisa el panel de Seenode / límites del plan).
- **Caché:** Las páginas y datos se revalidan cada 30 s y hay caché de rutas dinámicas/estáticas, así se reduce la carga a la base de datos.
- **Comprobar que responde:** Abre `https://TU-DOMINIO.vercel.app/api/health` en el navegador; debe devolver `{ "database": "connected" }`. Si 3 usuarios usan la app a la vez y no ves errores de “too many connections” en Vercel/Seenode, el acceso concurrente está bien configurado.

## Arquitectura: una conexión por instancia

La app usa un **singleton de Prisma** (`src/lib/prisma.ts`). Todas las rutas, server components y API handlers importan `prisma` desde ese único módulo; no se crean instancias adicionales.

En Vercel serverless, cada petición puede ejecutarse en una función distinta (= proceso distinto). Cada proceso tiene su propio singleton, por lo que **N peticiones simultáneas ≈ N conexiones a la BD**. La app fuerza `connection_limit=1` por instancia para Seenode, minimizando el uso.

**Límite de Seenode:** Verifica en tu panel cuántas conexiones permite tu plan. Si hay muchos usuarios concurrentes, considera un plan con más conexiones o un pooler externo.

## Desarrollo local: usa Docker, no Seenode

Para evitar consumir las 5 conexiones de Seenode durante el desarrollo:

1. En `.env`, cambia `DATABASE_URL` y `DIRECT_URL` a Docker:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sistema_lab_dev"
   DIRECT_URL="postgresql://postgres:postgres@localhost:5433/sistema_lab_dev"
   ```
2. Levanta Docker: `docker compose up -d` (o el comando que use tu proyecto)
3. Deja Seenode solo para producción (Vercel)

## Evitar saturación (importante para Seenode)

Si ves **"Too many database connections"** o **"FATAL: too many connections for role"**:

1. **Añade `connection_limit=1` a la URL** en Vercel (Settings → Environment Variables):
   - `postgresql://user:pass@host:port/db?sslmode=require&connection_limit=1&pool_timeout=10&connect_timeout=15`
   - Tanto `DATABASE_URL` como `DIRECT_URL` deben tener estos parámetros

2. **Añade `PRISMA_CONNECTION_LIMIT=1`** en Vercel (refuerzo).

3. **Revisa el límite de tu plan en Seenode** – muchos planes permiten 5–10 conexiones. Cada petición simultánea en Vercel ≈ 1 conexión. Con 5+ usuarios o pestañas abiertas se puede superar el límite.

4. **Alternativa: migrar a Neon o Supabase** – ofrecen poolers integrados y funcionan mejor con serverless. Neon: [neon.tech](https://neon.tech). Supabase: [supabase.com](https://supabase.com).

## Ajustes opcionales de pool (avanzado)

- `PRISMA_CONNECTION_LIMIT` – para Seenode la app fuerza máx. 1 en prod; solo tiene efecto en dev
- `PRISMA_POOL_TIMEOUT` (segundos)
- `PRISMA_CONNECT_TIMEOUT` (segundos)

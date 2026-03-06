# Configuración de Vercel + Seenode

Este proyecto usa **Seenode** como base de datos en producción. Sigue estos pasos para que la app funcione en Vercel.

## Variables de entorno en Vercel

1. Ve a [vercel.com](https://vercel.com) → tu proyecto → **Settings** → **Environment Variables**
2. Configura exactamente estas 3 variables:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `DATABASE_URL` | Tu connection string de Seenode (copiada del panel de Seenode) | Production, Preview, Development |
| `NEXTAUTH_URL` | La URL real de tu app, ej: `https://sistema-laboratorio-enfoque.vercel.app` | Production, Preview, Development |
| `NEXTAUTH_SECRET` | Una clave secreta (usa la misma que en desarrollo) | Production, Preview, Development |

## Aplicar migraciones a Seenode

Antes de usar la app, debes aplicar el esquema a la base de datos de Seenode:

```bash
# Con DATABASE_URL apuntando a Seenode en .env (o inline):
DATABASE_URL="postgresql://..." pnpm prisma migrate deploy
```

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

- **Conexiones a la BD:** Cada instancia de la app en Vercel usa 1 conexión a Seenode. Con 3 personas usando la app a la vez, se abren como máximo 3 conexiones. Tu plan de **Seenode debe permitir al menos 3 conexiones** (revisa el panel de Seenode / límites del plan).
- **Caché:** Las páginas y datos se revalidan cada 30 s y hay caché de rutas dinámicas/estáticas, así se reduce la carga a la base de datos.
- **Comprobar que responde:** Abre `https://TU-DOMINIO.vercel.app/api/health` en el navegador; debe devolver `{ "database": "connected" }`. Si 3 usuarios usan la app a la vez y no ves errores de “too many connections” en Vercel/Seenode, el acceso concurrente está bien configurado.

# Guía de despliegue

Checklist para dejar el sistema listo para producción.

## Pre-despliegue

- [ ] Detener el servidor de desarrollo local (`Ctrl+C` si está corriendo)
- [ ] Ejecutar `pnpm build` para verificar que compila sin errores
- [ ] Commit y push de los cambios pendientes

## Vercel + Seenode (recomendado)

### 1. Base de datos (Seenode)

1. Crear cuenta en [seenode.com](https://seenode.com)
2. Crear base de datos PostgreSQL
3. Copiar el **connection string** del panel (formato: `postgresql://usuario:password@host:puerto/nombre_bd`)

### 2. Proyecto Vercel

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. En **Settings** → **Environment Variables**, añadir:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `DATABASE_URL` | Connection string de Seenode (añadir `?sslmode=require` si no incluye SSL) | Production, Preview, Development |
| `NEXTAUTH_URL` | URL de la app, ej: `https://tu-app.vercel.app` | Production, Preview, Development |
| `NEXTAUTH_SECRET` | Clave generada con `openssl rand -base64 32` | Production, Preview, Development |

### 3. Migraciones

Antes del primer uso, aplicar el esquema a Seenode:

```bash
DATABASE_URL="postgresql://..." pnpm prisma migrate deploy
```

O temporalmente poner la URL de Seenode en `.env` y ejecutar:

```bash
pnpm migrate:deploy
```

### 4. Datos iniciales (seed)

Crear usuario admin y datos base:

```bash
DATABASE_URL="postgresql://..." pnpm db:seed
```

O usar la URL de `.env` si ya está configurada.

### 5. Verificación

- Visitar `https://tu-app.vercel.app/api/health` → debe responder `{"database":"connected"}`
- Iniciar sesión con `admin@sistemalis.local` / `admin123`
- Cambiar la contraseña en Configuración → Usuarios

## Variables de entorno (referencia)

Ver `.env.example` para la lista completa.

**Obligatorias en producción:**
- `DATABASE_URL` – PostgreSQL (Seenode, Neon, etc.)
- `NEXTAUTH_URL` – URL pública de la app
- `NEXTAUTH_SECRET` – Clave para sesiones

**Opcionales:**
- `PRISMA_CONNECTION_LIMIT` – Límite de conexiones (ej: `1` para Seenode gratuito)

## Comandos útiles

```bash
# Build local (detener dev antes)
pnpm build

# Iniciar producción localmente
pnpm start

# Migraciones
pnpm migrate:deploy
```

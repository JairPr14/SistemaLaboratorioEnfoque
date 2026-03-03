# Base de datos con Docker

Para separar la base de datos de **desarrollo** (local) de la de **producción** (despliegue), usa PostgreSQL en Docker para desarrollo.

## Inicio rápido

### 1. Iniciar PostgreSQL local

```bash
docker compose up -d
```

### 2. Configurar .env para desarrollo

Crea o edita `.env` con las URLs locales:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sistema_lab_dev"
SHADOW_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-generado"
```

### 3. Ejecutar migraciones y seed

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
```

### 4. Iniciar la app

```bash
pnpm dev
```

### 5. Credenciales de acceso (tras ejecutar el seed)

| Campo      | Valor                   |
|-----------|--------------------------|
| **Email** | `admin@sistemalis.local` |
| **Contraseña** | `admin123`       |

**⚠️ IMPORTANTE:** Cambia la contraseña después del primer acceso (Configuración → Usuarios).

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `docker compose up -d` | Iniciar PostgreSQL en segundo plano |
| `docker compose down` | Detener y eliminar contenedores |
| `docker compose logs -f postgres` | Ver logs del contenedor |
| `docker compose down -v` | Detener y eliminar volúmenes (borra todos los datos locales) |

## Cambiar entre desarrollo y producción

- **Desarrollo:** usa `DATABASE_URL` apuntando a `localhost:5432/sistema_lab_dev`
- **Producción:** usa `DATABASE_URL` apuntando a tu servidor real (Seenode, Neon, etc.)

No mezcles ambas. Mantén la BD de producción fuera del `.env` en despliegues (usa variables de entorno del host/Vercel/Railway, etc.).

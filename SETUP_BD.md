# Configuración de Base de Datos - Migración a PostgreSQL Local

## Opción 1: Docker (recomendado)

1. Instala [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. En `.env` cambia el puerto a **5433** (Docker usa ese puerto)
3. Ejecuta:
```powershell
npm run docker:up
# Espera 10 segundos
npx prisma migrate deploy
npm run db:seed
npm run dev
```

## Opción 2: PostgreSQL local (ya instalado)

Tienes PostgreSQL 18 corriendo. Necesitas:

1. **Crear la base de datos** `sistema_lab_dev` (con pgAdmin o psql)
2. **Configurar la contraseña** en `.env` si no es `postgres`

Formato en `.env`:
```
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/sistema_lab_dev"
```

3. Ejecutar:
```powershell
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### Crear la BD con pgAdmin
- Conecta a tu servidor PostgreSQL
- Click derecho en Databases → Create → Database
- Nombre: `sistema_lab_dev`

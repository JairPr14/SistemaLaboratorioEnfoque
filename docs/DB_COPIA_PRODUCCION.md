# Copiar base de datos de producción a Docker local

Para desarrollar con datos reales sin saturar Seenode (límite de conexiones), copia la BD de producción a PostgreSQL en Docker.

## Pasos

### 1. Configurar .env

Asegúrate de que `.env` tenga:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sistema_lab_dev"
```

Y añade la URL de producción (Seenode) para la copia:

```
PRODUCTION_DATABASE_URL="postgresql://usuario:contraseña@host:puerto/base?sslmode=require"
```

O pásala por sesión (PowerShell):

```powershell
$env:PRODUCTION_DATABASE_URL="postgresql://..."
```

### 2. Ejecutar la copia

**Opción A – Todo en uno** (levanta Docker y copia):

```bash
pnpm db:setup-from-production
```

**Opción B – Manual**:

```bash
pnpm docker:up
# Espera unos segundos
pnpm db:copy-production
```

### 3. Reiniciar el servidor de desarrollo

```bash
pnpm dev
```

## Solución al error "database server is running at localhost:5432"

Ese error indica que la app intenta conectar a Docker pero Postgres no está corriendo. Solución:

1. Ejecuta `pnpm docker:up`
2. Espera 5–10 segundos
3. Ejecuta `pnpm db:copy-production` para cargar datos de producción
4. Reinicia `pnpm dev`

## Notas

- El script **solo lee** de producción y **escribe** en Docker. No modifica Seenode.
- El archivo `backup-production.sql` se genera temporalmente; puedes borrarlo después.
- Si Docker no está instalado, instala [Docker Desktop](https://www.docker.com/products/docker-desktop/).

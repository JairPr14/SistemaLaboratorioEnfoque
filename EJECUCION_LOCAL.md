# Ejecución local con Docker y CMD

Guía para ejecutar el sistema en tu PC usando Docker (base de datos) y CMD/PowerShell. Ideal cuando no vas a desplegar el proyecto en un servidor.

## Requisitos

- **Node.js** 18 o superior (se recomienda 20+)
- **pnpm** – `npm install -g pnpm`
- **Docker Desktop** – [Descargar](https://www.docker.com/products/docker-desktop/)

## Inicio rápido (CMD o PowerShell)

### 1. Clonar e instalar

```cmd
git clone https://github.com/JairPr14/SistemaLaboratorioEnfoque.git
cd SistemaLaboratorioEnfoque
pnpm install
```

### 2. Configurar .env

Copia `.env.example` a `.env` y ajusta:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sistema_lab_dev"
DIRECT_URL="postgresql://postgres:postgres@localhost:5433/sistema_lab_dev"
SHADOW_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/postgres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="genera-una-clave-aleatoria"
```

Para generar `NEXTAUTH_SECRET` en PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 3. Levantar Docker (PostgreSQL)

```cmd
pnpm docker:up
```

Espera 5–10 segundos a que Postgres inicie.

### 4. Migraciones y datos iniciales

```cmd
pnpm exec prisma migrate deploy
pnpm db:seed
```

### 5. Iniciar la aplicación

```cmd
pnpm dev
```

Abre **http://localhost:3000** en el navegador.

### 6. Credenciales por defecto

| Campo        | Valor                    |
|-------------|---------------------------|
| **Email**   | `admin@sistemalis.local`  |
| **Contraseña** | `admin123`            |

Cambia la contraseña en Configuración → Usuarios después del primer acceso.

---

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `pnpm docker:up` | Iniciar PostgreSQL en Docker |
| `pnpm docker:down` | Detener Docker |
| `pnpm dev` | Servidor de desarrollo (puerto 3000) |
| `pnpm build` | Compilar para producción |
| `pnpm start` | Ejecutar build de producción |
| `pnpm studio:local` | Abrir Prisma Studio (ver/editar BD) |

---

## Traer datos de producción (Seenode) a Docker

Si ya tienes una base de datos en Seenode y quieres trabajar con datos reales:

1. Añade en `.env`:
   ```env
   PRODUCTION_DATABASE_URL="postgresql://usuario:contraseña@host:puerto/db?sslmode=require"
   ```
2. Ejecuta:
   ```cmd
   pnpm db:setup-from-production
   ```
   (Levanta Docker y copia la BD de Seenode a local)

---

## Subir datos de Docker a Seenode

Si modificaste datos en local y quieres sincronizarlos a producción:

```cmd
pnpm db:push-to-production
```

⚠️ Esto reemplaza la BD de Seenode con la de Docker.

---

## Solución de problemas

### "No se puede conectar a la base de datos"
- Comprueba que Docker esté corriendo: `docker ps`
- Ejecuta `pnpm docker:up` y espera unos segundos
- Verifica que `.env` use puerto **5433** (no 5432)

### "NextAuth secret not set"
- Asegúrate de tener `NEXTAUTH_SECRET` en `.env`
- Genera uno nuevo con el comando de PowerShell indicado arriba

### "Unknown argument" en Prisma
- Ejecuta: `pnpm exec prisma generate`
- Reinicia `pnpm dev`

### Puerto 5433 ocupado
- Otra instancia de Docker o Postgres puede estar usando ese puerto
- Detén otros contenedores o cambia el puerto en `docker-compose.yml` y `.env`

### "EPERM" o "operation not permitted" al hacer build
- Cierra `pnpm dev` y cualquier Prisma Studio antes de ejecutar `pnpm build`
- Los archivos de Prisma pueden estar bloqueados por otro proceso

### Advertencia "Unsupported engine: wanted node 24.x"
- Es solo una advertencia. Node 20 o 22 funcionan correctamente

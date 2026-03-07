# Sistema de Laboratorio Clínico

Sistema de gestión de laboratorio clínico desarrollado con Next.js 16, Prisma, PostgreSQL (Neon) y NextAuth.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 18 o superior)
- **pnpm** (gestor de paquetes recomendado) o npm/yarn
- **Git**

### Instalar pnpm (si no lo tienes)

```bash
npm install -g pnpm
```

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone https://github.com/JairPr14/SistemaLaboratorioEnfoque.git
cd SistemaLaboratorioEnfoque
```

### 2. Instalar Dependencias

```bash
pnpm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` copiando `.env.example` y configúralo:

```env
# Base de datos PostgreSQL (usa Docker local para desarrollo)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sistema_lab_dev"
SHADOW_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-key-aqui-genera-una-aleatoria"
```

Para desarrollo local necesitas PostgreSQL. Usa Docker: `pnpm docker:up`

**Importante:** Para generar un `NEXTAUTH_SECRET` seguro, puedes usar:

```bash
openssl rand -base64 32
```

O en PowerShell:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 4. Configurar la Base de Datos

#### 4.1. Generar el Cliente de Prisma

```bash
pnpm exec prisma generate
```

#### 4.2. Ejecutar las Migraciones

```bash
pnpm exec prisma migrate deploy
```

Esto creará todas las tablas necesarias. **Antes:** asegúrate de tener PostgreSQL corriendo (Docker: `pnpm docker:up`). Para producción, ver [Despliegue](#-despliegue-en-producción).

#### 4.3. Poblar la Base de Datos (Opcional)

Para crear datos iniciales (usuario admin, roles, secciones, etc.):

```bash
pnpm exec prisma db seed
```

**Nota:** Si aparece algún error de "Unknown argument" (promotionId, packagePrice, etc.), significa que el cliente de Prisma está desactualizado. Detén el servidor (Ctrl+C), ejecuta `pnpm exec prisma generate` y vuelve a arrancar.

### 5. Iniciar el Servidor de Desarrollo

```bash
pnpm dev
```

El servidor estará disponible en [http://localhost:3000](http://localhost:3000)

## 🔐 Primer Acceso

### Usuario Administrador por Defecto

Si ejecutaste el seed, puedes iniciar sesión con:

- **Email:** `admin@sistemalis.local`
- **Contraseña:** `admin123`

**⚠️ IMPORTANTE:** Cambia esta contraseña inmediatamente después del primer acceso desde Configuración → Usuarios.

### Crear Usuario Administrador Manualmente

Si no ejecutaste el seed, usa Prisma Studio para crear el rol y usuario, o ejecuta:

```bash
pnpm db:seed
```

## 📁 Estructura del Proyecto

```
SistemaLaboratorioEnfoque/
├── prisma/
│   ├── schema.prisma          # Esquema de la base de datos
│   ├── migrations/            # Migraciones de Prisma
│   └── seed.ts                # Script de datos iniciales
├── src/
│   ├── app/                   # Rutas de Next.js (App Router)
│   │   ├── (app)/             # Rutas protegidas (requieren autenticación)
│   │   │   ├── dashboard/     # Dashboard principal
│   │   │   ├── patients/      # Gestión de pacientes
│   │   │   ├── orders/        # Gestión de órdenes
│   │   │   ├── pagos/         # Pagos y caja
│   │   │   ├── reportes/      # Reportes
│   │   │   └── configuracion/ # Configuración del sistema
│   │   ├── api/               # API Routes
│   │   └── login/             # Página de login
│   ├── components/            # Componentes React reutilizables
│   ├── lib/                   # Utilidades y configuración
│   └── features/              # Lógica de negocio
├── docker-compose.yml         # PostgreSQL local para desarrollo
└── .env                       # Variables de entorno (no se sube a git)
```

## 🔑 Sistema de Permisos

El sistema utiliza un sistema de permisos basado en roles. Cada rol puede tener los siguientes permisos:

- **REPORTES**: Ver la sección de reportes
- **EDITAR_PACIENTES**: Modificar datos de pacientes
- **ELIMINAR_REGISTROS**: Eliminar pacientes, órdenes e ítems de órdenes

### Configurar Permisos de un Rol

1. Inicia sesión como administrador
2. Ve a **Configuración** → **Roles**
3. Crea o edita un rol
4. Marca los permisos que deseas asignar al rol
5. Guarda los cambios

**Nota:** Los usuarios con rol que tenga código `ADMIN` y sin permisos configurados tendrán todos los permisos por defecto (compatibilidad hacia atrás).

## 🛠️ Comandos Útiles

### Desarrollo

```bash
# Iniciar servidor de desarrollo
pnpm dev

# Generar cliente de Prisma (si cambias el schema)
pnpm exec prisma generate

# Ver base de datos en Prisma Studio
pnpm exec prisma studio

# Ejecutar migraciones pendientes
pnpm exec prisma migrate deploy

# Crear nueva migración (después de cambiar schema.prisma)
pnpm exec prisma migrate dev --name nombre_de_la_migracion
```

### Producción

```bash
# Construir para producción
pnpm build

# Iniciar servidor de producción
pnpm start
```

### Base de Datos

```bash
# Resetear base de datos (⚠️ elimina todos los datos)
pnpm exec prisma migrate reset

# Poblar base de datos con datos iniciales
pnpm exec prisma db seed
```

## 🐛 Solución de Problemas Comunes

### Error: "Unknown argument 'promotionId'" o similar

**Causa:** El cliente de Prisma está desactualizado.

**Solución:**
1. Detén el servidor (Ctrl+C)
2. Ejecuta: `pnpm exec prisma generate`
3. Reinicia el servidor: `pnpm dev`

### Error: "Database locked" o "EPERM"

**Causa:** Otro proceso está usando la base de datos (servidor corriendo, Prisma Studio abierto, etc.).

**Solución:**
1. Cierra todos los procesos que puedan estar usando la base de datos (servidor, Prisma Studio)
2. Vuelve a intentar la operación

### Error: "No se puede conectar a la base de datos"

**Causa:** La ruta de `DATABASE_URL` en `.env` es incorrecta o la base de datos no existe.

**Solución:**
1. Verifica que `DATABASE_URL` en `.env` apunte a PostgreSQL (Docker o Seenode)
2. Ejecuta las migraciones: `pnpm exec prisma migrate deploy`

### Error: "NextAuth secret not set"

**Causa:** Falta `NEXTAUTH_SECRET` en `.env`.

**Solución:**
1. Genera un secret: `openssl rand -base64 32`
2. Añádelo a `.env`: `NEXTAUTH_SECRET="tu-secret-generado"`

## 🚀 Despliegue en Producción

Para desplegar en producción, consulta la guía completa en [DEPLOYMENT.md](./DEPLOYMENT.md).

### Opción A: Seenode (PostgreSQL)

1. **Crear cuenta en Seenode**: https://seenode.com
2. **Crear base de datos PostgreSQL**:
   - En el dashboard, ve a **Databases** → **Create first database**
   - Tipo: **PostgreSQL**
   - Nombre: `sistema-lab` (o el que prefieras)
   - Elige el tier según tu necesidad
3. **Obtener connection string**: En el panel de la base de datos verás host, usuario, contraseña y nombre. Arma la URL:
   ```
   postgresql://USUARIO:PASSWORD@HOST:5432/NOMBRE_DB?sslmode=require
   ```
4. **Configurar `.env`**:
   ```env
   DATABASE_URL="postgresql://usuario:password@tu-host.seenode.com:5432/tu_database?sslmode=require"
   ```
5. **Ejecutar migraciones y seed**:
   ```bash
   pnpm exec prisma migrate deploy
   pnpm exec prisma db seed
   ```

### Opción B: Resumen Rápido (Vercel + Neon PostgreSQL)

1. **Crear cuenta en Neon** (gratis): https://neon.tech
2. **Crear proyecto en Vercel**: https://vercel.com
3. **Conectar Neon con Vercel** usando la integración nativa
4. **Configurar variables de entorno** en Vercel:
   - `DATABASE_URL` (desde Neon)
   - `NEXTAUTH_SECRET` (generar uno nuevo)
   - `NEXTAUTH_URL` (URL de tu app en Vercel)
   - `NODE_ENV=production`
5. **Desplegar**: Vercel ejecutará automáticamente las migraciones
6. **Ejecutar el seed** para crear el usuario admin (ver abajo)

**Nota:** Los planes gratuitos de Vercel y Neon son suficientes para un laboratorio pequeño con hasta 4 usuarios simultáneos.

### 🌱 Ejecutar Seed en Producción (Crear Usuario Admin)

Después de desplegar en Vercel y ejecutar las migraciones, necesitas ejecutar el seed para crear el usuario administrador inicial.

#### Opción 1: Ejecutar desde tu máquina local (Recomendado)

1. Obtén tu `DATABASE_URL` de Neon (desde el dashboard de Neon)
2. Ejecuta el script de seed para producción:

```bash
# En PowerShell (Windows)
$env:DATABASE_URL="tu-connection-string-de-neon"; pnpm tsx scripts/seed-production.ts

# En Bash/Linux/Mac
DATABASE_URL="tu-connection-string-de-neon" pnpm tsx scripts/seed-production.ts
```

O usa el script helper:

```bash
# Configura la variable de entorno primero
export DATABASE_URL="tu-connection-string-de-neon"  # Linux/Mac
# O en PowerShell:
$env:DATABASE_URL="tu-connection-string-de-neon"

# Luego ejecuta:
pnpm tsx scripts/seed-production.ts
```

#### Opción 2: Ejecutar desde Vercel CLI

```bash
# Instala Vercel CLI si no lo tienes
npm i -g vercel

# Conecta con tu proyecto
vercel login
vercel link

# Ejecuta el seed usando las variables de entorno de Vercel
vercel env pull .env.production
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2) pnpm tsx prisma/seed.ts
```

#### Opción 3: Ejecutar directamente con Prisma

```bash
# Configura DATABASE_URL y ejecuta
DATABASE_URL="tu-connection-string-de-neon" pnpm exec prisma db seed
```

**Después de ejecutar el seed, las credenciales de acceso son:**
- **Email:** `admin@sistemalis.local`
- **Contraseña:** `admin123`

⚠️ **IMPORTANTE:** Cambia la contraseña inmediatamente después del primer acceso desde Configuración → Usuarios.

## 📝 Notas Importantes

- En desarrollo se usa PostgreSQL local (Docker). En producción se usa PostgreSQL (Seenode/Neon).
- El archivo `.env` contiene información sensible y **NO debe subirse a Git**.
- Las migraciones de Prisma están en `prisma/migrations/`. No las modifiques manualmente.
- Para producción, consulta [DEPLOYMENT.md](./DEPLOYMENT.md) para instrucciones detalladas.

## 🔄 Actualizar el Proyecto

Si clonaste el proyecto y hay cambios nuevos:

```bash
# Obtener últimos cambios
git pull origin main

# Instalar nuevas dependencias (si las hay)
pnpm install

# Regenerar cliente de Prisma
pnpm exec prisma generate

# Ejecutar nuevas migraciones
pnpm exec prisma migrate deploy
```

## 📞 Soporte

Para problemas o preguntas, revisa los issues en el repositorio de GitHub o contacta al equipo de desarrollo.

---

**Versión:** 0.1.0  
**Última actualización:** Febrero 2026

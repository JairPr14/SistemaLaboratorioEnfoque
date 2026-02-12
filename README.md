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

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Base de datos (SQLite para desarrollo)
DATABASE_URL="file:./prisma/dev.db?connection_limit=1&busy_timeout=10000"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-key-aqui-genera-una-aleatoria"
```

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

Esto creará todas las tablas necesarias en la base de datos.

**Nota:** En desarrollo se usa SQLite. Para producción, ver la sección de [Despliegue](#-despliegue-en-producción).

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

- **Email:** `admin@lab.com`
- **Contraseña:** `admin123`

**⚠️ IMPORTANTE:** Cambia esta contraseña inmediatamente después del primer acceso desde Configuración → Usuarios.

### Crear Usuario Administrador Manualmente

Si no ejecutaste el seed, puedes crear un usuario administrador desde la consola de Prisma:

```bash
pnpm exec prisma studio
```

O usando un script SQL:

1. Abre `prisma/dev.db` con un cliente SQLite
2. Ejecuta:

```sql
-- Crear rol ADMIN
INSERT INTO Role (id, code, name, description, "isActive", "createdAt", "updatedAt", permissions)
VALUES ('admin-role-id', 'ADMIN', 'Administrador', 'Rol con todos los permisos', 1, datetime('now'), datetime('now'), '["REPORTES","EDITAR_PACIENTES","ELIMINAR_REGISTROS"]');

-- Crear usuario (la contraseña es 'admin123' hasheada con bcrypt)
INSERT INTO User (id, email, "passwordHash", name, "isActive", "roleId", "createdAt", "updatedAt")
VALUES ('user-id', 'admin@lab.com', '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', 'Administrador', 1, 'admin-role-id', datetime('now'), datetime('now'));
```

## 📁 Estructura del Proyecto

```
SistemaLaboratorioEnfoque/
├── prisma/
│   ├── schema.prisma          # Esquema de la base de datos
│   ├── dev.db                 # Base de datos SQLite (se crea automáticamente)
│   ├── migrations/            # Migraciones de Prisma
│   └── seed.ts                # Script de datos iniciales
├── src/
│   ├── app/                   # Rutas de Next.js (App Router)
│   │   ├── (app)/             # Rutas protegidas (requieren autenticación)
│   │   │   ├── dashboard/     # Dashboard principal
│   │   │   ├── patients/      # Gestión de pacientes
│   │   │   ├── orders/        # Gestión de órdenes
│   │   │   ├── reportes/      # Reportes (solo admin)
│   │   │   └── configuracion/ # Configuración del sistema
│   │   ├── api/               # API Routes
│   │   └── login/             # Página de login
│   ├── components/            # Componentes React reutilizables
│   ├── lib/                   # Utilidades y configuración
│   │   ├── auth.ts            # Configuración de NextAuth
│   │   └── prisma.ts          # Cliente de Prisma
│   └── features/              # Lógica de negocio
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
1. Cierra todos los procesos que puedan estar usando `prisma/dev.db`
2. Vuelve a intentar la operación

### Error: "No se puede conectar a la base de datos"

**Causa:** La ruta de `DATABASE_URL` en `.env` es incorrecta o la base de datos no existe.

**Solución:**
1. Verifica que `DATABASE_URL="file:./prisma/dev.db"` en `.env`
2. Ejecuta las migraciones: `pnpm exec prisma migrate deploy`

### Error: "NextAuth secret not set"

**Causa:** Falta `NEXTAUTH_SECRET` en `.env`.

**Solución:**
1. Genera un secret: `openssl rand -base64 32`
2. Añádelo a `.env`: `NEXTAUTH_SECRET="tu-secret-generado"`

## 🚀 Despliegue en Producción

Para desplegar en producción, consulta la guía completa en [DEPLOYMENT.md](./DEPLOYMENT.md).

### Resumen Rápido (Vercel + Neon PostgreSQL)

1. **Crear cuenta en Neon** (gratis): https://neon.tech
2. **Crear proyecto en Vercel**: https://vercel.com
3. **Conectar Neon con Vercel** usando la integración nativa
4. **Configurar variables de entorno** en Vercel:
   - `DATABASE_URL` (desde Neon)
   - `NEXTAUTH_SECRET` (generar uno nuevo)
   - `NEXTAUTH_URL` (URL de tu app en Vercel)
   - `NODE_ENV=production`
5. **Desplegar**: Vercel ejecutará automáticamente las migraciones

**Nota:** Los planes gratuitos de Vercel y Neon son suficientes para un laboratorio pequeño con hasta 4 usuarios simultáneos.

## 📝 Notas Importantes

- En desarrollo se usa SQLite (`prisma/dev.db`). En producción se usa PostgreSQL (Neon).
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

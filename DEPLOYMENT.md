# Guía de Despliegue - Vercel + Neon PostgreSQL

Esta guía te ayudará a desplegar el Sistema de Laboratorio Clínico en producción usando Vercel y Neon PostgreSQL.

## 📋 Requisitos Previos

- Cuenta en [Vercel](https://vercel.com) (gratis)
- Cuenta en [Neon](https://neon.tech) (gratis)
- Repositorio Git (GitHub, GitLab, o Bitbucket)
- Node.js 18+ instalado localmente (para pruebas)

## 🚀 Paso 1: Configurar Neon PostgreSQL

### 1.1 Crear cuenta en Neon

1. Ve a https://neon.tech y crea una cuenta gratuita
2. Inicia sesión en el dashboard

### 1.2 Crear proyecto en Neon

1. Haz clic en "Create Project"
2. Elige un nombre para tu proyecto (ej: `sistema-lab-prod`)
3. Selecciona la región más cercana a tus usuarios
4. Elige PostgreSQL versión 15 o superior
5. Haz clic en "Create Project"

### 1.3 Obtener Connection String

1. En el dashboard de Neon, ve a la sección "Connection Details"
2. Copia la **Connection String** (formato: `postgresql://user:password@host/database?sslmode=require`)
3. **Importante:** Si planeas usar connection pooling (recomendado para producción), agrega `?pgbouncer=true` al final de la URL

Ejemplo:
```
postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require&pgbouncer=true
```

### 1.4 Configurar Connection Pooling (Opcional pero Recomendado)

Neon ofrece connection pooling para mejorar el rendimiento:
- En el dashboard de Neon, ve a "Connection Pooling"
- Habilita PgBouncer
- Usa la URL de pooling en lugar de la URL directa

## 🔗 Paso 2: Conectar Neon con Vercel

### Opción A: Integración Nativa (Recomendada)

1. En el dashboard de Neon, ve a "Integrations"
2. Busca "Vercel" y haz clic en "Connect"
3. Autoriza la conexión con Vercel
4. Selecciona el proyecto de Vercel donde quieres conectar la base de datos
5. Neon configurará automáticamente las variables de entorno en Vercel

### Opción B: Configuración Manual

Si prefieres configurar manualmente:

1. En Vercel, ve a tu proyecto → Settings → Environment Variables
2. Agrega las siguientes variables:
   - `DATABASE_URL`: La connection string de Neon
   - `NEXTAUTH_SECRET`: Genera uno con `openssl rand -base64 32`
   - `NEXTAUTH_URL`: La URL de tu app en Vercel (ej: `https://tu-app.vercel.app`)
   - `NODE_ENV`: `production`

## 📦 Paso 3: Desplegar en Vercel

### 3.1 Conectar Repositorio

1. Ve a https://vercel.com y crea una cuenta si no la tienes
2. Haz clic en "Add New Project"
3. Conecta tu repositorio Git (GitHub, GitLab, o Bitbucket)
4. Selecciona el repositorio del proyecto

### 3.2 Configurar Proyecto

Vercel detectará automáticamente que es un proyecto Next.js. Configura:

- **Framework Preset:** Next.js
- **Root Directory:** `./` (o la ruta donde está tu proyecto)
- **Build Command:** `npm run build` (o `pnpm build`)
- **Output Directory:** `.next` (automático)
- **Install Command:** `npm install` (o `pnpm install`)

### 3.3 Variables de Entorno

Si no usaste la integración nativa de Neon, agrega estas variables en Vercel:

```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
NEXTAUTH_SECRET=tu-secret-generado
NEXTAUTH_URL=https://tu-app.vercel.app
NODE_ENV=production
```

### 3.4 Desplegar

1. Haz clic en "Deploy"
2. Vercel comenzará a construir y desplegar tu aplicación
3. Espera a que termine el proceso (puede tardar 2-5 minutos)

## 🗄️ Paso 4: Ejecutar Migraciones

Después del primer despliegue, necesitas ejecutar las migraciones de Prisma:

### Opción A: Usando Vercel CLI (Recomendada)

1. Instala Vercel CLI: `npm i -g vercel`
2. Inicia sesión: `vercel login`
3. Ejecuta las migraciones:
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

### Opción B: Usando Script de Build

Agrega un script de postinstall en `package.json` (ya está incluido):

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "migrate:deploy": "prisma migrate deploy"
  }
}
```

Luego, en Vercel, agrega un Build Command personalizado:
```bash
npm run postinstall && npm run migrate:deploy && npm run build
```

### Opción C: Ejecutar Manualmente desde Neon SQL Editor

1. Ve al dashboard de Neon
2. Abre el SQL Editor
3. Ejecuta las migraciones manualmente desde `prisma/migrations/`

## ✅ Paso 5: Verificar Despliegue

### 5.1 Health Check

Visita `https://tu-app.vercel.app/api/health` para verificar que todo esté funcionando:

```json
{
  "status": "ok",
  "timestamp": "2026-02-12T...",
  "database": "connected"
}
```

### 5.2 Verificar Variables de Entorno

En Vercel → Settings → Environment Variables, verifica que todas las variables estén configuradas correctamente.

### 5.3 Probar Login

1. Visita `https://tu-app.vercel.app/login`
2. Intenta iniciar sesión con las credenciales por defecto:
   - Email: `admin@sistemalis.local`
   - Contraseña: `admin123`
3. **Importante:** Cambia la contraseña inmediatamente después del primer acceso

## 🔧 Configuración Adicional

### Connection Pooling en Neon

Para mejorar el rendimiento en producción:

1. En Neon, habilita PgBouncer
2. Usa la URL de pooling en `DATABASE_URL`
3. Formato: `postgresql://...?sslmode=require&pgbouncer=true`

### Monitoreo de Uso

- **Neon Dashboard:** Monitorea uso de almacenamiento, lecturas, y ancho de banda
- **Vercel Dashboard:** Monitorea funciones serverless, tráfico, y errores

### Límites del Plan Gratuito

**Vercel Hobby (Gratis):**
- 100 GB de transferencia/mes
- Despliegues ilimitados
- HTTPS automático

**Neon Free Tier:**
- 1 GB de almacenamiento
- 100,000 lecturas/mes
- 1 GB de ancho de banda/mes
- Escala a cero automáticamente

**Nota:** Estos límites son más que suficientes para un laboratorio pequeño con 4 usuarios.

## 🐛 Troubleshooting

### Error: "Database connection failed"

1. Verifica que `DATABASE_URL` esté correctamente configurada en Vercel
2. Asegúrate de que la URL incluya `?sslmode=require`
3. Verifica que la base de datos en Neon esté activa (puede estar "dormida" si no hay uso)

### Error: "Prisma Client not generated"

1. Verifica que `postinstall` script esté en `package.json`
2. En Vercel, asegúrate de que el Build Command incluya `prisma generate`

### Error: "Migration failed"

1. Verifica que las migraciones estén en `prisma/migrations/`
2. Ejecuta `npx prisma migrate deploy` localmente primero para verificar
3. Revisa los logs de Vercel para ver el error específico

### La base de datos está "dormida"

Neon escala a cero automáticamente. La primera conexión después de inactividad puede tardar 1-2 segundos. Esto es normal y no afecta el funcionamiento.

### Error: "NEXTAUTH_SECRET not set"

1. Genera un nuevo secret: `openssl rand -base64 32`
2. Agrégalo a las variables de entorno en Vercel
3. Vuelve a desplegar

## 📝 Comandos Útiles

```bash
# Generar cliente de Prisma
npm run postinstall

# Ejecutar migraciones en producción
npm run migrate:deploy

# Ver logs de Vercel
vercel logs

# Verificar variables de entorno
vercel env pull .env.local
```

## 🔄 Actualizaciones Futuras

Para actualizar la aplicación:

1. Haz push de los cambios a tu repositorio Git
2. Vercel desplegará automáticamente los cambios
3. Si hay nuevas migraciones, ejecuta `npm run migrate:deploy` después del despliegue

## 📞 Soporte

- **Documentación de Vercel:** https://vercel.com/docs
- **Documentación de Neon:** https://neon.tech/docs
- **Documentación de Prisma:** https://www.prisma.io/docs

---

**Última actualización:** Febrero 2026

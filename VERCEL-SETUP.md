# Configuración Rápida para Vercel

## Variables de Entorno Requeridas

Configura estas variables en Vercel → Settings → Environment Variables:

### 1. DATABASE_URL
```
postgresql://neondb_owner:npg_rmzMC4cea8dZ@ep-fancy-tree-aigu9z8y-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Nota:** Esta URL ya incluye connection pooling (pooler), así que está lista para producción. ✅

### 2. NEXTAUTH_SECRET
Genera uno nuevo con:
```bash
openssl rand -base64 32
```

O en PowerShell:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Ejemplo generado (puedes usar este o generar uno nuevo):
```
NEXTAUTH_SECRET=PyqnpAnUYKxFinmzAqAxsxP+s+8T4ZX/YIZsEnbo26g=
```

**Nota:** Este secret fue generado aleatoriamente. Puedes usarlo o generar uno nuevo si prefieres.

### 3. NEXTAUTH_URL
Después de desplegar, será la URL de tu app. Ejemplo:
```
NEXTAUTH_URL=https://sistema-lab.vercel.app
```

**Importante:** Reemplaza `sistema-lab.vercel.app` con la URL real que Vercel te asigne.

### 4. NODE_ENV
```
NODE_ENV=production
```

## Pasos Rápidos

1. **Ve a Vercel** → Tu proyecto → Settings → Environment Variables
2. **Agrega cada variable** una por una:
   - `DATABASE_URL` = (la connection string de arriba)
   - `NEXTAUTH_SECRET` = (genera uno nuevo)
   - `NEXTAUTH_URL` = (la URL de tu app en Vercel, después del primer deploy)
   - `NODE_ENV` = `production`
3. **Haz deploy** o **redeploy** si ya desplegaste

## Verificación

Después del despliegue, verifica:
- Health check: `https://tu-app.vercel.app/api/health`
- Debe retornar: `{"status":"ok","database":"connected"}`

## Ejecutar Migraciones

Después del primer despliegue, ejecuta las migraciones:

```bash
# Opción 1: Usando Vercel CLI
npm i -g vercel
vercel login
vercel env pull .env.local
npx prisma migrate deploy
```

O agrega esto al Build Command en Vercel:
```bash
npm run postinstall && npm run migrate:deploy && npm run build
```

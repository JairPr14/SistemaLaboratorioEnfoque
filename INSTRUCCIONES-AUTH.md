# Login y base de datos

## Por qué dice "correo incorrecto"

La tabla **User** y los **roles** se crean con migraciones. Si la migración `add_user` no se ha aplicado, la tabla no existe y el login falla.

## Pasos (con la BD libre)

1. **Detén el servidor**  
   En la terminal donde corre `pnpm run dev` (o `npm run dev`), pulsa **Ctrl+C**.

2. **Aplica migraciones y seed**
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

   O en un solo paso:
   ```bash
   npm run db:setup
   ```

3. **Vuelve a generar el cliente Prisma** (por si acaso)
   ```bash
   npx prisma generate
   ```

4. **Arranca de nuevo el servidor**
   ```bash
   pnpm run dev
   ```

## Credenciales por defecto (seed)

- **Email:** `admin@sistemalis.local`
- **Contraseña:** `admin123`

## Roles creados en el seed

- **ADMIN** – Administrador (acceso total)
- **LAB** – Laboratorio (resultados y plantillas)
- **RECEPTION** – Recepción (pacientes y órdenes)

El usuario inicial tiene el rol **ADMIN**.

# 📋 Flujo Completo del Sistema de Laboratorio Clínico

## 🔐 1. AUTENTICACIÓN Y ACCESO

### 1.1 Login
**Ruta:** `/login`

**Flujo:**
1. Usuario accede a cualquier ruta protegida → Middleware redirige a `/login`
2. Usuario ingresa:
   - **Email:** `admin@sistemalis.local`
   - **Contraseña:** `admin123`
3. Sistema valida credenciales con NextAuth:
   - Busca usuario en BD por email (normalizado a minúsculas)
   - Verifica que el usuario esté activo (`isActive: true`)
   - Compara contraseña con hash bcrypt almacenado
   - Carga permisos del rol asignado
4. Si es válido:
   - Crea sesión JWT (válida por 30 días)
   - Redirige a `/dashboard` o a la URL original (`callbackUrl`)

**Protección:**
- Middleware protege todas las rutas excepto `/login` y `/api/auth/*`
- Todas las rutas API requieren autenticación o permisos específicos

---

## 🏠 2. DASHBOARD PRINCIPAL

**Ruta:** `/dashboard`

**Contenido:**
- **Métricas:**
  - Pacientes activos (total registrados)
  - Órdenes del mes actual
  - Órdenes pendientes (PENDIENTE/EN_PROCESO)
  - Análisis en catálogo (activos)
  - Órdenes creadas hoy
  - Tiempo promedio de entrega

- **Acciones rápidas:**
  - Botón "Orden rápida" → Modal para crear orden sin salir del dashboard
  - Botón "Paciente" → Ir a gestión de pacientes
  - Búsqueda global (pacientes y órdenes)

- **Tabla de pendientes:**
  - Muestra últimas 50 órdenes pendientes/completadas
  - Indica análisis faltantes por capturar
  - Botón para validar orden cuando todos los análisis están completos

- **Actividad reciente:**
  - Últimas 12 órdenes creadas/completadas/entregadas

---

## 👥 3. GESTIÓN DE PACIENTES

### 3.1 Listado de Pacientes
**Ruta:** `/patients`

**Funcionalidad:**
- Lista todos los pacientes activos (no eliminados)
- Búsqueda por DNI, nombre, apellido o código
- Acciones: Ver detalles, Editar, Eliminar (requiere permiso)

### 3.2 Crear Paciente
**Ruta:** `/patients` → Botón "Nuevo paciente"

**Flujo:**
1. Formulario con campos:
   - DNI (único, requerido)
   - Nombre y Apellido (requeridos)
   - Fecha de nacimiento (requerida)
   - Sexo (M/F/O)
   - Teléfono, Dirección, Email (opcionales)
2. Sistema genera código automático (secuencial)
3. Valida que el DNI no exista
4. Crea paciente en BD

### 3.3 Editar Paciente
**Ruta:** `/patients/[id]`

**Permisos:** Requiere `PERMISSION_EDITAR_PACIENTES`
- Solo administradores o usuarios con permiso específico pueden editar
- El código del paciente NO se puede cambiar

### 3.4 Eliminar Paciente
**Permisos:** Requiere `PERMISSION_ELIMINAR_REGISTROS`
- Soft delete: marca `deletedAt` con fecha actual
- No se puede eliminar si tiene órdenes asociadas

---

## 📝 4. CREACIÓN DE ÓRDENES

### 4.1 Orden Normal
**Ruta:** `/orders/new`

**Flujo paso a paso:**

1. **Selección de Paciente:**
   - Buscar por DNI o nombre
   - Mostrar últimos 3 pacientes registrados
   - Seleccionar paciente existente

2. **Datos de la Orden:**
   - Fecha de la orden (por defecto: hoy)
   - Tipo de paciente: Clínica / Externo / Izaga (opcional, para reportes)
   - Médico solicitante (opcional)
   - Notas/Indicaciones (opcional)

3. **Selección de Análisis:**
   
   **Opción A: Promociones (Paquetes)**
   - Seleccionar promoción del dropdown
   - La promoción incluye múltiples análisis
   - Precio puede ser:
     - Precio promocional fijo (`packagePrice`)
     - Suma de precios individuales (si `packagePrice` es null)
   - Al agregar promoción:
     - Se eliminan automáticamente análisis individuales que ya están incluidos
     - Muestra mensaje informativo si se eliminaron análisis

   **Opción B: Análisis Individuales**
   - Buscar análisis por código, nombre o sección
   - Seleccionar análisis del catálogo
   - Si el análisis ya está en una promoción seleccionada:
     - Se muestra mensaje informativo
     - NO se permite seleccionarlo individualmente
   - Los análisis se agrupan por sección visualmente

4. **Validación:**
   - Debe haber al menos un análisis o promoción seleccionada
   - No permite duplicados (análisis en promoción + análisis individual)

5. **Creación:**
   - Genera código de orden único (formato: `YYYYMMDD-XXX`)
   - Calcula total: suma de precios de promociones + análisis individuales
   - Crea orden con estado `PENDIENTE`
   - Crea items de orden:
     - Cada análisis se guarda como `LabOrderItem`
     - Si viene de promoción: guarda `promotionId` y `promotionName`
     - Guarda snapshot del precio (`priceSnapshot`)
     - Guarda snapshot de la plantilla si existe (`templateSnapshot`)
   - Redirige a `/orders` (listado de órdenes)

### 4.2 Orden Rápida
**Ruta:** Botón "Orden rápida" en Dashboard

**Flujo:**
1. Modal con formulario simplificado
2. **Paciente:**
   - Buscar paciente existente O
   - Crear paciente rápido (solo datos básicos: nombre, apellido, DNI, fecha nacimiento, sexo)
3. **Análisis:**
   - Seleccionar promociones y/o análisis individuales
   - Misma validación de duplicados que orden normal
4. **Médico e Indicación:** Opcionales
5. Al crear:
   - Crea orden y redirige a página de captura de resultados (`/orders/[id]`)

---

## 🔬 5. CAPTURA DE RESULTADOS

### 5.1 Vista de Orden
**Ruta:** `/orders/[id]`

**Información mostrada:**
- Datos del paciente
- Código de orden, fecha, estado
- Total de la orden
- Lista de análisis agrupados por:
  - **Promociones:** Muestra nombre de la promoción y análisis incluidos
  - **Análisis sueltos:** Análisis individuales no incluidos en promociones

**Estados de cada análisis (item):**
- `PENDIENTE` - Sin capturar
- `EN_PROCESO` - En captura
- `COMPLETADO` - Resultados capturados y validados

### 5.2 Capturar Resultado de un Análisis
**Flujo:**

1. **Acceso:**
   - Desde Worklist: Click en análisis pendiente
   - Desde orden: Click en "Capturar resultados" del análisis
   - URL: `/orders/[id]?captureItem=[itemId]`

2. **Formulario de Captura:**
   - Carga plantilla del análisis (si existe)
   - Muestra parámetros agrupados por grupos (si aplica)
   - Para cada parámetro:
     - Nombre del parámetro
     - Campo de valor (texto, número, o select según tipo)
     - Unidad de medida
     - Rango de referencia (según edad y sexo del paciente)
     - Validación automática: marca si está fuera de rango

3. **Guardado:**
   - **Borrador:** Se guarda automáticamente cada 1 segundo mientras se escribe
     - Endpoint: `PUT /api/orders/[id]/items/[itemId]/result-draft`
     - Guarda como `isDraft: true`
   - **Guardar Final:**
     - Endpoint: `POST /api/orders/[id]/items/[itemId]/result`
     - Marca `isDraft: false`
     - Guarda `reportedAt` (fecha/hora)
     - Guarda `reportedBy` (opcional, nombre del técnico)
     - Actualiza estado del item a `COMPLETADO`

4. **Validación de Rangos:**
   - Sistema busca rangos de referencia según:
     - Edad del paciente (NIÑOS, JOVENES, ADULTOS)
     - Sexo del paciente (M, F, O)
   - Si el valor está fuera de rango, se marca `isOutOfRange: true`
   - Se muestra visualmente en el formulario

### 5.3 Validar Orden Completa
**Flujo:**

1. **Condición:** Todos los análisis de la orden están `COMPLETADO`
2. **Acción:** Botón "Validar orden" aparece en la orden
3. **Proceso:**
   - Endpoint: `POST /api/orders/[id]/validate`
   - Cambia todos los borradores (`isDraft: true`) a validados (`isDraft: false`)
   - Cambia estado de la orden a `COMPLETADO`
4. **Resultado:** Orden lista para entregar

---

## 📊 6. WORKLIST (Lista de Trabajo)

**Ruta:** `/worklist`

**Funcionalidad:**
- Muestra órdenes pendientes agrupadas por sección de laboratorio
- Filtros:
  - **Sección:** Bioquímica, Hematología, Inmunología, Orina, Heces, Otros
  - **Rango de tiempo:** Hoy, 7 días, 30 días

**Ordenamiento:**
- Por riesgo (SLA): órdenes más antiguas primero
- Por antigüedad: más antiguas primero

**Información mostrada:**
- Código de orden
- Nombre del paciente
- Estado de la orden
- Análisis pendientes por capturar
- Alertas visuales:
  - 🟢 Verde: Normal
  - 🟡 Amarillo: Atención necesaria
  - 🔴 Rojo: Urgente (SLA vencido o múltiples análisis faltantes)

**Acciones:**
- Click en análisis pendiente → Va a captura de resultados
- Botón "Siguiente pendiente" → Va al primer análisis pendiente de la sección

---

## 📄 7. ESTADOS DE ÓRDENES

### Estados Disponibles:
1. **PENDIENTE** (Inicial)
   - Orden creada, esperando captura de resultados
   - Puede cambiar a: EN_PROCESO, COMPLETADO, ANULADO

2. **EN_PROCESO**
   - Orden en proceso de captura
   - Puede cambiar a: COMPLETADO, ENTREGADO, ANULADO

3. **COMPLETADO**
   - Todos los análisis tienen resultados capturados y validados
   - Puede cambiar a: ENTREGADO, ANULADO

4. **ENTREGADO**
   - Orden entregada al paciente
   - Estado final (solo puede anularse)

5. **ANULADO**
   - Orden cancelada
   - Estado final
   - No se pueden agregar análisis
   - No se pueden capturar resultados

### Cambio de Estado:
- Desde página de detalle de orden (`/orders/[id]`)
- Botones disponibles según estado actual
- Al marcar como ENTREGADO:
  - Guarda `deliveredAt` con fecha/hora actual
  - Aparece en sección "Entregados"

---

## 🖨️ 8. IMPRESIÓN DE RESULTADOS

**Ruta:** `/orders/[id]/print`

**Flujo:**

1. **Acceso:**
   - Desde detalle de orden: Botón "Imprimir"
   - Selección de análisis a imprimir (checkboxes)
   - Si no se selecciona ninguno, imprime todos

2. **Generación del PDF:**
   - Agrupa análisis por sección
   - Cada sección = una página A4
   - Formato profesional con:
     - Encabezado con datos del paciente
     - Datos: Nombre, DNI, Edad, Sexo, Fecha, Código de orden
     - Sección destacada con barra negra
     - Tabla de resultados con:
       - Nombre del parámetro
       - Resultado (marcado si está fuera de rango)
       - Unidad
       - Valores de referencia (según edad y sexo)
     - Pie de página con:
       - Reportado por (si aplica)
       - Fecha de entrega (si aplica)
       - Sello virtual (si está configurado)
       - Firma del técnico médico

3. **Configuración de Sello:**
   - Admin puede subir imagen de sello en Configuración
   - Activar/desactivar inclusión en PDFs
   - El sello aparece en cada página impresa

---

## 📦 9. PROMOCIONES (PAQUETES)

**Ruta:** `/promociones`

### 9.1 Crear Promoción
**Permisos:** Requiere permisos de administrador

**Flujo:**
1. Click "Nueva promoción"
2. Ingresar:
   - Nombre de la promoción
   - Precio promocional (opcional):
     - Si se ingresa: precio fijo para todo el paquete
     - Si es null: precio = suma de precios individuales
3. Seleccionar análisis a incluir:
   - Buscar y seleccionar del catálogo
   - Ordenar análisis (drag & drop o numeración)
4. Guardar

### 9.2 Usar Promoción en Orden
- Al crear orden, aparece dropdown "Agregar promoción"
- Seleccionar promoción → Se agregan todos sus análisis
- Si se intenta agregar análisis individual que ya está en la promoción:
  - Sistema previene duplicado
  - Muestra mensaje informativo

---

## 📚 10. CATÁLOGO Y PLANTILLAS

### 10.1 Catálogo de Análisis
**Ruta:** `/catalog/tests`

**Funcionalidad:**
- Lista todos los análisis disponibles
- Crear nuevo análisis:
  - Código (único)
  - Nombre
  - Sección (Bioquímica, Hematología, etc.)
  - Precio
  - Tiempo estimado (opcional)
- Editar/Eliminar análisis existentes
- Marcar como favoritos (aparecen primero en selección)

### 10.2 Plantillas de Análisis
**Ruta:** `/templates`

**Funcionalidad:**
- Cada análisis puede tener una plantilla asociada
- La plantilla define:
  - Parámetros a capturar
  - Tipo de valor (texto, número, select)
  - Unidades de medida
  - Rangos de referencia:
    - General (para todos)
    - Específicos por edad (NIÑOS, JOVENES, ADULTOS)
    - Específicos por sexo (M, F, O)
    - Combinaciones (ej: "Niños + Hombres")
  - Orden de los parámetros
  - Agrupación (grupos de parámetros)

**Uso:**
- Al capturar resultados, la plantilla se carga automáticamente
- Los rangos de referencia se ajustan según edad y sexo del paciente

---

## 🔍 11. BÚSQUEDA Y FILTROS

### 11.1 Búsqueda Global
**Ubicación:** Barra superior del dashboard

**Funcionalidad:**
- Busca pacientes y órdenes simultáneamente
- Mínimo 2 caracteres
- Resultados:
  - Pacientes: Nombre completo + DNI
  - Órdenes: Código de orden
- Click en resultado → Va a página correspondiente

### 11.2 Filtros en Listados
- **Órdenes:** Por estado, paciente, rango de fechas
- **Pacientes:** Por nombre, DNI, código
- **Worklist:** Por sección, rango de tiempo

---

## ⚙️ 12. CONFIGURACIÓN Y ADMINISTRACIÓN

**Ruta:** `/configuracion`

**Permisos:** Requiere permisos de administrador

### 12.1 Gestión de Roles
- Crear, editar, eliminar roles
- Asignar permisos:
  - `REPORTES` - Ver reportes
  - `EDITAR_PACIENTES` - Modificar datos de pacientes
  - `ELIMINAR_REGISTROS` - Eliminar registros
- Roles predefinidos:
  - ADMIN - Todos los permisos
  - LAB - Laboratorio (captura de resultados)
  - RECEPTION - Recepción (pacientes y órdenes)

### 12.2 Gestión de Usuarios
- Crear usuarios:
  - Email (único)
  - Contraseña (mínimo 6 caracteres)
  - Nombre (opcional)
  - Rol asignado
- Editar usuarios:
  - Cambiar rol
  - Activar/desactivar
  - **Cambiar contraseña** (nueva funcionalidad)
- Eliminar usuarios

### 12.3 Configuración de Impresión
- Subir sello virtual (imagen PNG/JPG/WebP, máximo 2MB)
- Activar/desactivar inclusión en PDFs
- Vista previa del sello

---

## 📈 13. REPORTES

**Ruta:** `/reportes`

**Permisos:** Requiere `PERMISSION_REPORTES`

**Funcionalidad:**
- Filtrar por:
  - Rango de fechas
  - Estado de orden
  - Tipo de paciente (Clínica/Externo/Izaga)
  - Sección de análisis
- Métricas mostradas:
  - Total de órdenes
  - Total de análisis realizados
  - Ingresos totales
  - Promedios y estadísticas

---

## 🔄 14. FLUJO COMPLETO DE UNA ORDEN

### Ejemplo Completo:

1. **Recepción crea orden:**
   - Va a `/orders/new`
   - Selecciona paciente (o crea nuevo)
   - Selecciona promoción "Perfil Lipídico" + análisis individual "Glucosa"
   - Crea orden → Estado: `PENDIENTE`

2. **Orden aparece en:**
   - Dashboard (tabla de pendientes)
   - Worklist (por sección)
   - Listado de órdenes (`/orders`)

3. **Técnico de laboratorio captura resultados:**
   - Va a Worklist → Sección "Bioquímica"
   - Click en análisis pendiente
   - Se abre formulario con plantilla
   - Ingresa valores
   - Guarda → Estado del item: `COMPLETADO`

4. **Validación:**
   - Cuando todos los análisis están completos
   - Aparece botón "Validar orden"
   - Click → Estado de orden: `COMPLETADO`

5. **Entrega:**
   - Recepción marca orden como `ENTREGADO`
   - Se guarda fecha de entrega
   - Orden aparece en `/delivered`

6. **Impresión:**
   - Click "Imprimir" en orden entregada
   - Selecciona análisis a imprimir
   - Genera PDF profesional
   - Se imprime y entrega al paciente

---

## 🔒 15. SEGURIDAD Y PERMISOS

### Niveles de Acceso:

1. **Público (sin autenticación):**
   - Solo `/login`

2. **Autenticado (cualquier usuario):**
   - Ver catálogo de análisis
   - Ver plantillas
   - Ver promociones disponibles
   - Crear órdenes
   - Ver órdenes propias
   - Capturar resultados
   - Ver worklist
   - Ver pacientes

3. **Con Permisos Específicos:**
   - `PERMISSION_EDITAR_PACIENTES`: Editar pacientes
   - `PERMISSION_ELIMINAR_REGISTROS`: Eliminar registros
   - `PERMISSION_REPORTES`: Ver reportes

4. **Administrador (requiere `PERMISSION_ELIMINAR_REGISTROS` o rol ADMIN):**
   - Gestión de usuarios
   - Gestión de roles
   - Gestión de promociones
   - Configuración de impresión
   - Crear/editar/eliminar análisis y plantillas

### Validaciones de Seguridad:
- Todas las rutas API validan autenticación
- Rutas administrativas validan permisos específicos
- Middleware protege todas las rutas del frontend
- Sesiones JWT con expiración de 30 días

---

## 📱 16. INTERFAZ Y NAVEGACIÓN

### Estructura de Navegación:

**Sidebar (lateral izquierdo):**
- Dashboard
- Worklist
- Pacientes
- Catálogo
- Promociones
- Plantillas
- Órdenes
- Resultados
- Pendientes
- Entregados
- Reportes (solo con permiso)
- Configuración (siempre visible)

**Topbar (superior):**
- Búsqueda global
- Información del usuario
- Cerrar sesión
- Toggle de tema (claro/oscuro)

### Responsive:
- Diseño adaptativo para móviles y tablets
- Tablas con scroll horizontal en pantallas pequeñas
- Formularios optimizados para touch

---

## 🎯 17. CARACTERÍSTICAS ESPECIALES

### 17.1 Autoguardado de Borradores
- Los resultados se guardan automáticamente cada 1 segundo mientras se escribe
- Permite recuperar trabajo si hay interrupción
- Los borradores se marcan como `isDraft: true`

### 17.2 Validación de Rangos de Referencia
- Sistema busca automáticamente el rango correcto según:
  - Edad del paciente
  - Sexo del paciente
- Marca valores fuera de rango visualmente
- Muestra múltiples rangos si aplican (ej: "Niños: 0-5, Adultos: 5-10")

### 17.3 Prevención de Duplicados
- No permite agregar análisis que ya están en promociones seleccionadas
- Al agregar promoción, elimina análisis individuales duplicados
- Muestra mensajes informativos claros

### 17.4 Códigos Únicos
- Pacientes: Código secuencial automático
- Órdenes: Formato `YYYYMMDD-XXX` (fecha + secuencial del día)
- Análisis: Código único definido manualmente

### 17.5 Soft Delete
- Pacientes y análisis se marcan como eliminados (`deletedAt`)
- No se eliminan físicamente de la BD
- Permite recuperación de datos

---

## 📊 18. DATOS Y PERSISTENCIA

### Base de Datos: SQLite (desarrollo)
- Archivo: `prisma/dev.db`
- Migraciones: `prisma/migrations/`
- Schema: `prisma/schema.prisma`

### Modelos Principales:
- **User:** Usuarios del sistema
- **Role:** Roles con permisos
- **Patient:** Pacientes
- **LabTest:** Análisis del catálogo
- **LabTemplate:** Plantillas de análisis
- **TestProfile:** Promociones/paquetes
- **LabOrder:** Órdenes de laboratorio
- **LabOrderItem:** Análisis dentro de una orden
- **LabResult:** Resultados de un análisis
- **LabResultItem:** Valores individuales de resultados

---

## 🔄 19. FLUJOS DE DATOS

### Crear Orden:
```
Usuario → Formulario → Validación Frontend → API POST /api/orders
→ Validación Backend → Crear LabOrder → Crear LabOrderItems
→ Calcular Total → Guardar en BD → Retornar orden creada
```

### Capturar Resultado:
```
Usuario → Seleccionar análisis → Cargar plantilla → Ingresar valores
→ Autoguardado (borrador) → Guardar final → API POST /api/orders/[id]/items/[itemId]/result
→ Validar datos → Crear/Actualizar LabResult → Crear LabResultItems
→ Actualizar estado del item a COMPLETADO → Retornar éxito
```

### Validar Orden:
```
Usuario → Click "Validar" → API POST /api/orders/[id]/validate
→ Verificar todos los items están COMPLETADO → Cambiar isDraft a false
→ Cambiar estado de orden a COMPLETADO → Retornar éxito
```

---

## 🎨 20. INTERFAZ DE USUARIO

### Tema:
- Modo claro y oscuro
- Toggle en esquina superior derecha
- Persiste preferencia del usuario

### Componentes UI:
- Diseño consistente con shadcn/ui
- Componentes reutilizables:
  - Cards, Buttons, Badges
  - Tables, Forms, Dialogs
  - Inputs, Selects, Checkboxes

### Feedback al Usuario:
- Toasts (notificaciones) para:
  - Éxito en operaciones
  - Errores
  - Información
- Estados de carga en botones
- Mensajes de error claros y descriptivos

---

Este es el flujo completo y detallado del sistema tal como funciona actualmente. Cada funcionalidad está protegida con autenticación y permisos apropiados, y el sistema previene duplicados y valida datos en cada paso.

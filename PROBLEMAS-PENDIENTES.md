# 🔍 Problemas y Mejoras Pendientes

## 🚨 CRÍTICOS (Deben corregirse urgentemente)

### ✅ 1. **Validación de permisos en rutas API críticas** - CORREGIDO
   - **Rutas corregidas**:
     - ✅ `/api/config/users` (GET, POST) - Ahora requiere admin
     - ✅ `/api/config/users/[id]` (PATCH, DELETE) - Ahora requiere admin
     - ✅ `/api/config/print` (GET, PATCH) - Ahora requiere admin
     - ✅ `/api/config/print/upload` (POST) - Ahora requiere admin
     - ✅ `/api/roles` (GET, POST) - Ahora requiere admin
     - ✅ `/api/roles/[id]` (PATCH, DELETE) - Ahora requiere admin
     - ✅ `/api/test-profiles` (POST) - Ahora requiere admin (GET es público)
     - ✅ `/api/test-profiles/[id]` (PATCH, DELETE) - Ahora requiere admin (GET es público)
     - ✅ `/api/tests` (POST) - Ahora requiere autenticación (GET es público)
     - ✅ `/api/tests/[id]` (PUT, DELETE) - Ahora requiere autenticación (GET es público)
     - ✅ `/api/templates` (POST) - Ahora requiere autenticación (GET es público)
     - ✅ `/api/templates/[id]` (PUT, DELETE) - Ahora requiere autenticación (GET es público)
     - ✅ `/api/orders` (GET, POST) - Ahora requiere autenticación
     - ✅ `/api/orders/[id]` (GET, PUT) - Ahora requiere autenticación
     - ✅ `/api/orders/[id]/items` (POST) - Ahora requiere autenticación
     - ✅ `/api/orders/[id]/repeat` (POST) - Ahora requiere autenticación
     - ✅ `/api/orders/[id]/validate` (POST) - Ahora requiere autenticación
     - ✅ `/api/orders/[id]/items/[itemId]/result` (GET, POST, PUT) - Ahora requiere autenticación
     - ✅ `/api/orders/[id]/items/[itemId]/result-draft` (PUT) - Ahora requiere autenticación
     - ✅ `/api/orders/quick` (POST) - Ahora requiere autenticación
     - ✅ `/api/patients` (GET, POST) - Ahora requiere autenticación
     - ✅ `/api/patients/[id]` (GET) - Ahora requiere autenticación
     - ✅ `/api/patients/next-code` (GET) - Ahora requiere autenticación
     - ✅ `/api/worklist` (GET) - Ahora requiere autenticación
     - ✅ `/api/pending` (GET) - Ahora requiere autenticación
     - ✅ `/api/search` (GET) - Ahora requiere autenticación
   - **Estado**: ✅ Completado

### ✅ 2. **Validación de duplicados al agregar análisis a orden existente** - CORREGIDO
   - **Problema**: No validaba si los análisis a agregar ya estaban en promociones de la orden
   - **Solución**: Agregada validación que verifica promociones existentes antes de agregar análisis
   - **Estado**: ✅ Completado

### ✅ 3. **Helper para manejo de errores estandarizado** - AGREGADO
   - **Archivo**: `src/lib/api-errors.ts`
   - **Funcionalidad**: Función `handleApiError()` para manejar errores de forma consistente
   - **Estado**: ✅ Creado (puede ser usado gradualmente en las rutas)

## ⚠️ IMPORTANTES (Deben corregirse pronto)

### 4. **Validación de duplicados al agregar análisis a orden existente**
   - **Archivo**: `src/app/api/orders/[id]/items/route.ts`
   - **Problema**: No valida si los análisis a agregar ya están en promociones de la orden
   - **Impacto**: Puede permitir agregar análisis que ya están en promociones
   - **Solución**: Verificar `promotionId` de los items existentes antes de agregar

### 5. **Manejo de errores inconsistente**
   - **Problema**: Algunos endpoints devuelven diferentes formatos de error
   - **Ejemplos**:
     - Algunos usan `{ error: "mensaje" }`
     - Otros usan `{ error: "mensaje", details: error }`
   - **Solución**: Estandarizar el formato de respuestas de error

### 6. **Console.log/error en producción**
   - **Problema**: Muchos `console.error` y `console.log` en el código
   - **Impacto**: Puede exponer información sensible en producción
   - **Solución**: 
     - Usar un sistema de logging apropiado
     - Remover o condicionar logs a `NODE_ENV === 'development'`
     - Considerar usar una librería de logging como `winston` o `pino`

### 7. **Falta validación de entrada en algunas rutas**
   - **Rutas que necesitan validación adicional**:
     - `/api/search` - Validar longitud mínima de query
     - `/api/orders/[id]/items` - Validar que los IDs sean válidos UUIDs
     - `/api/config/print/upload` - Validar tipo y tamaño de archivo

### 8. **Problema potencial con SQL injection en búsqueda**
   - **Archivo**: `src/app/api/search/route.ts`
   - **Línea 12**: Aunque se escapan caracteres especiales, usar `$queryRaw` con parámetros es más seguro
   - **Solución**: Usar Prisma queries normales en lugar de raw queries cuando sea posible

## 📝 MEJORAS RECOMENDADAS

### 9. **Validación de permisos en frontend**
   - **Problema**: Algunos componentes no verifican permisos antes de mostrar acciones
   - **Ejemplo**: Botones de eliminar deberían ocultarse si el usuario no tiene permiso
   - **Solución**: Usar `hasPermission()` en componentes del cliente

### 10. **Manejo de estados de carga mejorado**
   - **Problema**: Algunos componentes no muestran estados de carga adecuados
   - **Solución**: Agregar skeletons o spinners en todas las operaciones asíncronas

### 11. **Validación de formularios más robusta**
   - **Problema**: Algunos formularios no validan todos los casos edge
   - **Ejemplos**:
     - Formulario de paciente: Validar formato de DNI
     - Formulario de orden: Validar que haya al menos un análisis seleccionado
   - **Solución**: Mejorar esquemas de validación con Zod

### 12. **Optimización de consultas a la base de datos**
   - **Problema**: Algunas consultas pueden ser optimizadas
   - **Ejemplo**: En `/api/orders/[id]/items` se podría incluir `promotionId` en la consulta inicial
   - **Solución**: Revisar y optimizar queries de Prisma

### 13. **Manejo de transacciones**
   - **Problema**: Algunas operaciones críticas no usan transacciones
   - **Ejemplo**: Crear orden con múltiples items debería ser atómico
   - **Solución**: Usar `prisma.$transaction()` en operaciones que modifican múltiples registros

### 14. **Validación de tipos TypeScript más estricta**
   - **Problema**: Algunos lugares usan `any` o tipos muy genéricos
   - **Solución**: Definir tipos específicos y usar `strict: true` en tsconfig

### 15. **Documentación de API**
   - **Problema**: No hay documentación de las rutas API
   - **Solución**: Considerar usar OpenAPI/Swagger o al menos comentarios JSDoc

### 16. **Tests faltantes**
   - **Problema**: No se encontraron archivos de tests
   - **Solución**: Agregar tests unitarios y de integración para funcionalidades críticas

### 17. **Variables de entorno faltantes**
   - **Problema**: `NEXTAUTH_URL` no está en `.env` pero se menciona en README
   - **Solución**: Agregar todas las variables necesarias al `.env.example`

### 18. **Manejo de errores de red mejorado**
   - **Problema**: Algunos componentes no manejan bien errores de conexión
   - **Solución**: Agregar retry logic y mensajes más descriptivos

### 19. **Accesibilidad (a11y)**
   - **Problema**: Algunos componentes pueden no ser accesibles
   - **Solución**: Agregar atributos ARIA, labels apropiados, navegación por teclado

### 20. **Performance**
   - **Problema**: Algunas páginas pueden cargar muchos datos innecesarios
   - **Solución**: Implementar paginación, lazy loading, y optimización de imágenes

## 🔒 SEGURIDAD

### 21. **Rate limiting faltante**
   - **Problema**: No hay límites de tasa para las APIs
   - **Solución**: Implementar rate limiting para prevenir abuso

### 22. **Validación de archivos subidos**
   - **Archivo**: `src/app/api/config/print/upload/route.ts`
   - **Problema**: Validar tipo MIME real, no solo extensión
   - **Solución**: Validar contenido del archivo, no solo nombre

### 23. **Sanitización de inputs**
   - **Problema**: Algunos inputs del usuario no se sanitizan antes de guardar
   - **Solución**: Sanitizar todos los inputs antes de guardar en BD

## 📊 RESUMEN POR PRIORIDAD

### 🔴 Alta Prioridad (Corregir inmediatamente)
1. Error de sintaxis en auth.ts
2. Validación de permisos en rutas API críticas
3. Problema en cálculo de análisis removidos

### 🟡 Media Prioridad (Corregir esta semana)
4. Validación de duplicados al agregar análisis
5. Manejo de errores inconsistente
6. Console.log en producción
7. Validación de entrada faltante
8. SQL injection potencial

### 🟢 Baja Prioridad (Mejoras continuas)
9-20. Mejoras recomendadas
21-23. Seguridad adicional

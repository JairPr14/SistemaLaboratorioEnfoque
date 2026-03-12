# Iniciar el proyecto automáticamente al encender el PC

## Opción 1: Inicio oculto (recomendado para producción)

El servidor se ejecuta en segundo plano **sin ventana visible**. No aparece en la barra de tareas y nadie puede cerrarlo por error.

1. Presiona `Win + R`, escribe `shell:startup` y pulsa Enter.
2. Crea un acceso directo:
   - Clic derecho → Nuevo → Acceso directo
   - Ubicación: `C:\Users\USUARIO\Desktop\ProyectoCLinica\scripts\iniciar-proyecto-oculto.vbs`
   - Nombre: `Sistema Laboratorio`
   - Finalizar

**Nota:** Para detener el servidor usa el Administrador de tareas (Ctrl+Shift+Esc) → buscar `node.exe` y finalizar tarea.

---

## Opción 2: Inicio con ventana visible

Si prefieres ver la consola (para depuración):

1. Acceso directo a: `C:\Users\USUARIO\Desktop\ProyectoCLinica\scripts\iniciar-proyecto.bat`

---

## Opción 3: Programador de tareas

1. Presiona `Win + R`, escribe `taskschd.msc` y pulsa Enter.
2. Crear tarea básica → Nombre: `Sistema Laboratorio`
3. Desencadenador: **Al iniciar sesión en el equipo**
4. Acción: **Iniciar un programa**
5. Programa: `powershell.exe`
6. Argumentos: `-WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\Users\USUARIO\Desktop\ProyectoCLinica\scripts\iniciar-proyecto.ps1"`
7. Marcar: **Ejecutar con los privilegios más altos** (si PostgreSQL lo requiere)

**Nota:** El servidor correrá en segundo plano. Para ver la salida o detenerlo, usa el Administrador de tareas y finaliza el proceso `node`.

---

## Ejecutar manualmente

- **Oculto:** doble clic en `scripts\iniciar-proyecto-oculto.vbs`
- **Con ventana:** doble clic en `scripts\iniciar-proyecto.bat`

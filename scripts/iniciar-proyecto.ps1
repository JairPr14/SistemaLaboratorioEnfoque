# ===========================================
# Inicia el Sistema de Laboratorio Clínico
# - Asegura que PostgreSQL esté corriendo
# - Ejecuta el servidor Next.js
# ===========================================

$proyecto = "C:\Users\USUARIO\Desktop\ProyectoCLinica"

# 1. Iniciar servicio PostgreSQL (si existe)
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    if ($pgService.Status -ne "Running") {
        Write-Host "Iniciando PostgreSQL..." -ForegroundColor Yellow
        Start-Service $pgService.Name
        Start-Sleep -Seconds 3
    }
    Write-Host "PostgreSQL: $($pgService.Status)" -ForegroundColor Green
} else {
    Write-Host "PostgreSQL no detectado como servicio. Continuando..." -ForegroundColor Yellow
}

# 2. Ir al proyecto e iniciar el servidor
Set-Location $proyecto
Write-Host "Iniciando servidor Next.js en http://localhost:3000" -ForegroundColor Cyan
npm run dev

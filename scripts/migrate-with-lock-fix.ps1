# Ejecutar migraciones cuando la BD esta bloqueada.
# Cierra procesos Node (incl. servidor Next) y aplica migraciones + seed.

Write-Host "Deteniendo procesos Node (libera dev.db)..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

Write-Host "Aplicando migraciones..." -ForegroundColor Cyan
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Si sigue 'database is locked': cierra Cursor, abre PowerShell en la carpeta del proyecto y ejecuta: npx prisma migrate deploy" -ForegroundColor Red
    exit 1
}

Write-Host "Ejecutando seed..." -ForegroundColor Cyan
npx prisma db seed
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Listo. Puedes volver a ejecutar 'pnpm run dev' o 'npm run dev'." -ForegroundColor Green

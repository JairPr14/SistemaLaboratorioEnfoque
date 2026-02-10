# Regenerar cliente Prisma cuando el servidor está corriendo
Write-Host "Deteniendo procesos Node (libera archivos Prisma)..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root
Write-Host "Regenerando cliente Prisma..." -ForegroundColor Cyan
Write-Host "Directorio actual: $(Get-Location)" -ForegroundColor Gray
npx prisma generate --schema=./prisma/schema.prisma
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al regenerar Prisma. Intenta manualmente: npx prisma generate" -ForegroundColor Red
    exit 1
}
Write-Host "Cliente Prisma regenerado correctamente." -ForegroundColor Green
Write-Host "Puedes volver a ejecutar 'pnpm run dev' o 'npm run dev'." -ForegroundColor Green

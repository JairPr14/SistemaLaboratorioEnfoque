# Exporta catálogo de análisis (LabSection, LabTest, LabTemplate, etc.) desde Docker
# Uso: .\scripts\export-catalogo.ps1
$out = Join-Path $PSScriptRoot ".." "backup_catalogo_analisis.sql"
$container = "sistema-lab-postgres-dev"
$db = "sistema_lab_dev"
# pg_dump -t necesita tabla con schema: public."LabSection"
docker exec $container pg_dump -U postgres $db --no-owner --no-acl --data-only `
  -t 'public."LabSection"' -t 'public."LabTest"' -t 'public."LabTestReferredLab"' `
  -t 'public."LabTemplate"' -t 'public."LabTemplateItem"' -t 'public."LabTemplateItemRefRange"' `
  -t 'public."TestProfile"' -t 'public."TestProfileItem"' -t 'public."ReferredLab"' -t 'public."DiscountType"' `
  -f /tmp/catalogo.sql
if ($LASTEXITCODE -ne 0) {
  Write-Host "Si el contenedor no esta corriendo, usa backup_docker.sql (ya contiene el catalogo)."
  exit 1
}
docker cp "${container}:/tmp/catalogo.sql" $out
Write-Host "Catálogo exportado en: $out"

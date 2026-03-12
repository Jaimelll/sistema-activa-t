$FECHA = Get-Date -Format "yyyy-MM-dd_HHmm"
$NOMBRE_ARCHIVO = "backup_activa_t_$FECHA.dump"

Write-Host "🚀 Iniciando respaldo de Supabase..." -ForegroundColor Cyan

# Ejecuta el backup usando volúmenes de Docker para evitar corrupción de PowerShell
docker run --rm -v "${PWD}:/data" -e PGPASSWORD='DbBackupActiva2026' postgres:17-alpine `
  pg_dump -h aws-1-us-east-1.pooler.supabase.com -p 6543 `
  -U postgres.zhtujzuuwecnqdecazam -d postgres -F c -f /data/$NOMBRE_ARCHIVO

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ¡Éxito! Backup guardado como: $NOMBRE_ARCHIVO" -ForegroundColor Green
} else {
    Write-Host "❌ Error: No se pudo realizar el respaldo." -ForegroundColor Red
}
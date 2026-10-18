# PowerShell twin of infra/debug-logs.sh. Paths are resolved relative to this script.
$ErrorActionPreference = 'Continue'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$compose = @('compose', '--env-file', (Join-Path $RootDir '.env'), '-f', (Join-Path $ScriptDir 'docker-compose.yml'))

Write-Host "=== Backend Logs (last 50 lines) ==="
& docker @compose logs --tail=50 backend
Write-Host ""
Write-Host "=== Qdrant Logs (last 20 lines) ==="
& docker @compose logs --tail=20 qdrant
Write-Host ""
Write-Host "=== Postgres Logs (last 20 lines) ==="
& docker @compose logs --tail=20 postgres
Write-Host ""
Write-Host "To see live logs:"
Write-Host "  docker compose --env-file .env -f infra/docker-compose.yml logs -f backend"

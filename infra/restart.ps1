# PowerShell twin of infra/restart.sh. Rebuilds with the layer cache by default;
# pass -NoCache for a clean rebuild (slow: it reinstalls torch).
param([switch]$NoCache)
$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

if (-not (Test-Path (Join-Path $RootDir '.env'))) {
  Write-Error "No .env found. Create it first: Copy-Item .env.example .env"
  exit 1
}
$compose = @('compose', '--env-file', (Join-Path $RootDir '.env'), '-f', (Join-Path $ScriptDir 'docker-compose.yml'))

Write-Host "Stopping containers..."
& docker @compose down
Write-Host "Rebuilding images..."
if ($NoCache) { & docker @compose build --no-cache } else { & docker @compose build }
Write-Host "Starting services..."
& docker @compose up -d
Write-Host ""
Write-Host "Waiting for services to start (30s)..."
Start-Sleep -Seconds 30
Write-Host ""
Write-Host "Checking health..."
& (Join-Path $ScriptDir 'check-health.ps1')
Write-Host ""
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:8011/docs"

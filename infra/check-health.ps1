# PowerShell twin of infra/check-health.sh: probe every service on the ports Compose publishes.
# Run from anywhere: powershell -ExecutionPolicy Bypass -File infra\check-health.ps1
# Works when Docker is reachable from Windows (Docker Desktop). Inside WSL use the .sh file.
$ErrorActionPreference = 'Continue'

function Test-Url([string]$Url) {
  try { $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5; return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) }
  catch { return $false }
}
function Show([string]$Name, [bool]$Ok, [string]$Hint) {
  if ($Ok) { Write-Host ("{0,-24} OK" -f $Name) -ForegroundColor Green }
  else { Write-Host ("{0,-24} DOWN" -f $Name) -ForegroundColor Red; if ($Hint) { Write-Host "  Try: $Hint" } }
}

Write-Host "Checking Litmus services..."
Show 'Backend'  (Test-Url 'http://127.0.0.1:8011/health')  'docker logs litmus-backend-1'
Show 'Qdrant'   (Test-Url 'http://127.0.0.1:6333/healthz') 'docker logs litmus-qdrant-1'

$pg = $false
try { & docker exec litmus-postgres-1 pg_isready -U litmus -d litmus *> $null; $pg = ($LASTEXITCODE -eq 0) } catch { }
if (-not $pg) { try { $pg = (Test-NetConnection -ComputerName 127.0.0.1 -Port 5434 -WarningAction SilentlyContinue).TcpTestSucceeded } catch { } }
Show 'Postgres' $pg 'docker logs litmus-postgres-1'

Show 'Frontend' (Test-Url 'http://127.0.0.1:5173') 'docker logs litmus-frontend-1'

if (Test-Url 'http://127.0.0.1:3100/api/public/health') { Show 'Langfuse (optional)' $true '' }
else { Write-Host ("{0,-24} not running (optional; start with --profile tracing)" -f 'Langfuse (optional)') -ForegroundColor Yellow }

Write-Host ""
Write-Host "URLs:"
Write-Host "  Frontend: http://localhost:5173"
Write-Host "  Backend:  http://localhost:8011/docs"

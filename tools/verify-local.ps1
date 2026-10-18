<#
.SYNOPSIS
  Windows side of the Litmus first-run check. Prints ONE block to paste back.
.DESCRIPTION
  Collects Windows facts (RAM, disk, .wslconfig, WSL and Docker disk images),
  then runs tools/verify-local.sh inside WSL and merges both outputs.
  Nothing is deleted or changed. Secrets are masked by the bash half.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File \\wsl$\Ubuntu\home\<you>\litmus\tools\verify-local.ps1
  powershell -ExecutionPolicy Bypass -File .\verify-local.ps1 -Distro Ubuntu -RepoPath '~/litmus' -- --skip-retrieval
#>
param(
  [string]$Distro = 'Ubuntu',
  [string]$RepoPath = '~/litmus',
  [string]$UbuntuDir = 'D:\WSL\Ubuntu',
  [string]$DockerDir = 'D:\WSL-Docker\DockerDesktopWSL',
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$BashArgs
)
$ErrorActionPreference = 'Continue'
$lines = New-Object System.Collections.Generic.List[string]
function Add-Line([string]$s) { $lines.Add($s) | Out-Null }
function Mask([string]$s) {
  $s = $s -replace '(?i)((API|SECRET|ACCESS|ADMIN|AUTH)?_?(KEY|TOKEN|PASSWORD|SALT)[A-Z_]*=)\S+', '$1***masked***'
  $s = $s -replace '(^|[^A-Za-z0-9])(sk-ant-|sk-|xai-)[A-Za-z0-9_-]{8,}', '$1$2***masked***'
  return $s
}

Add-Line ("=== LITMUS VERIFY (windows) " + (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') + " ===")

# --- OS and RAM
try {
  $os = Get-CimInstance Win32_OperatingSystem
  $cs = Get-CimInstance Win32_ComputerSystem
  Add-Line ("OS: {0} build {1}" -f $os.Caption, $os.BuildNumber)
  Add-Line ("RAM: total {0:N1} GB, free {1:N1} GB" -f ($cs.TotalPhysicalMemory / 1GB), ($os.FreePhysicalMemory / 1MB))
  $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
  Add-Line ("CPU: {0} ({1} cores, {2} threads)" -f $cpu.Name.Trim(), $cpu.NumberOfCores, $cpu.NumberOfLogicalProcessors)
} catch { Add-Line ("OS/RAM query failed: " + $_.Exception.Message) }

# --- Disk free
foreach ($d in 'C', 'D') {
  try {
    $v = Get-PSDrive -Name $d -ErrorAction Stop
    Add-Line ("Disk {0}: free {1:N1} GB" -f $d, ($v.Free / 1GB))
  } catch { Add-Line ("Disk {0}: not present" -f $d) }
}

# --- .wslconfig
$cfgPath = Join-Path $env:USERPROFILE '.wslconfig'
Add-Line "--- $cfgPath ---"
if (Test-Path $cfgPath) { Get-Content $cfgPath | ForEach-Object { Add-Line $_ } } else { Add-Line "(file not found: WSL uses its defaults, up to about half of RAM)" }

# --- WSL
Add-Line "--- wsl --version ---"
try { (& wsl.exe --version 2>&1) -join "`n" -replace "`0", '' | ForEach-Object { Add-Line $_ } } catch { Add-Line "wsl --version failed" }
Add-Line "--- wsl -l -v ---"
try { (& wsl.exe -l -v 2>&1) -join "`n" -replace "`0", '' | ForEach-Object { Add-Line $_ } } catch { Add-Line "wsl -l -v failed" }

# --- Disk images
Add-Line "--- virtual disk sizes ---"
foreach ($dir in $UbuntuDir, $DockerDir) {
  if (Test-Path $dir) {
    Get-ChildItem -Path $dir -Recurse -Filter *.vhdx -ErrorAction SilentlyContinue |
      ForEach-Object { Add-Line ("{0}  {1:N1} GB" -f $_.FullName, ($_.Length / 1GB)) }
  } else { Add-Line ("{0}: folder not found" -f $dir) }
}
$cvh = Get-ChildItem "$env:LOCALAPPDATA\Docker\wsl" -Recurse -Filter *.vhdx -ErrorAction SilentlyContinue
if ($cvh) { Add-Line "WARNING: Docker disk image still under C: -> $($cvh.FullName -join ', ')" }

# --- Top memory processes
Add-Line "--- top 6 processes by memory ---"
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 6 |
  ForEach-Object { Add-Line ("{0,-28} {1,8:N0} MB" -f $_.ProcessName, ($_.WorkingSet64 / 1MB)) }

# --- Docker (Windows side)
Add-Line "--- docker ---"
try { Add-Line ((& docker.exe --version 2>&1) -join ' ') } catch { Add-Line "docker.exe not on PATH (fine if integration works inside WSL)" }

# --- Bash half
Add-Line "--- running tools/verify-local.sh inside WSL ($Distro, $RepoPath) ---"
$argStr = ($BashArgs | Where-Object { $_ -ne '--' }) -join ' '
$cmd = "cd $RepoPath && bash tools/verify-local.sh $argStr"
$bashOut = & wsl.exe -d $Distro -- bash -lc $cmd 2>&1
$code = $LASTEXITCODE
foreach ($l in $bashOut) { Add-Line ([string]$l) }
Add-Line ("bash exit code: $code")
Add-Line "=== END (windows) ==="

$out = ($lines | ForEach-Object { Mask $_ }) -join [Environment]::NewLine
$file = Join-Path $env:USERPROFILE 'litmus-verify.txt'
$out | Out-File -FilePath $file -Encoding utf8
$out
Write-Host ""
Write-Host "Saved to $file. Paste the whole block between the two === lines back to Claude."
exit $code

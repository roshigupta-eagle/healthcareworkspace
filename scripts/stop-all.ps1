<#
Stop processes started by `start-all.ps1` by reading `.run/pids.json`.

Usage:
  .\scripts\stop-all.ps1
#>

$ErrorActionPreference = 'SilentlyContinue'

$repoRoot = Resolve-Path "$PSScriptRoot/.."
$repoRoot = $repoRoot.Path
$runDir = Join-Path $repoRoot '.run'
$pidsFile = Join-Path $runDir 'pids.json'

if (!(Test-Path $pidsFile)) {
  Write-Host "No PID file found at $pidsFile"
  exit 0
}

try {
  $content = Get-Content $pidsFile -Raw | ConvertFrom-Json
  foreach ($prop in $content.psobject.Properties) {
    $name = $prop.Name
    $pid = $prop.Value
    try {
      Stop-Process -Id $pid -Force -ErrorAction Stop
      Write-Host "Stopped $name (PID $pid)"
    } catch {
      Write-Host "Failed to stop $name (PID $pid): $_"
    }
  }
} finally {
  Remove-Item $pidsFile -ErrorAction SilentlyContinue
}

Write-Host "stop-all complete"

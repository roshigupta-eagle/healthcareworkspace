<#
Manage kubectl port-forward rules defined in `port-forward.config.json`.

Usage:
  .\scripts\port-forward.ps1 start
  .\scripts\port-forward.ps1 stop

Config format (scripts/port-forward.config.json):
[
  { "name": "postgres", "kubeTarget": "svc/postgres", "namespace": "default", "localPort": 5432, "remotePort": 5432 }
]

Requirements: `kubectl` in PATH
#>

param(
  [ValidateSet('start','stop')]
  [string]$Action = 'start'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path "$PSScriptRoot/.."; $repoRoot = $repoRoot.Path
$runDir = Join-Path $repoRoot '.run'
if (!(Test-Path $runDir)) { New-Item -ItemType Directory -Path $runDir | Out-Null }

$configFile = Join-Path $PSScriptRoot 'port-forward.config.json'
$pidFile = Join-Path $runDir 'portforwards.json'

if ($Action -eq 'start') {
  if (!(Test-Path $configFile)) { Write-Host "Missing config: $configFile"; exit 1 }
  $rules = Get-Content $configFile -Raw | ConvertFrom-Json
  $pf = @{}
  foreach ($r in $rules) {
    $name = $r.name
    $target = $r.kubeTarget
    $ns = $r.namespace
    $local = $r.localPort
    $remote = $r.remotePort
    Write-Host "Starting port-forward $name -> $target ($($local):$($remote)) in ns $ns"
    $args = @('port-forward', $target, "$($local):$($remote)", '-n', $ns)
    $proc = Start-Process -FilePath 'kubectl' -ArgumentList $args -PassThru
    $pf[$name] = $proc.Id
    Start-Sleep -Milliseconds 200
  }
  $pf | ConvertTo-Json | Out-File $pidFile -Encoding utf8
  Write-Host "Started port-forwards. PID file: $pidFile"
  exit 0
}

if ($Action -eq 'stop') {
  if (!(Test-Path $pidFile)) { Write-Host "No port-forward PID file found at $pidFile"; exit 0 }
  $pf = Get-Content $pidFile -Raw | ConvertFrom-Json
  foreach ($prop in $pf.psobject.Properties) {
    $name = $prop.Name
    $pid = $prop.Value
    try { Stop-Process -Id $pid -Force; Write-Host "Stopped $name (PID $pid)" } catch { Write-Host ("Failed to stop {0}: {1}" -f $name, $_) }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  Write-Host "Stopped all port-forwards"
  exit 0
}

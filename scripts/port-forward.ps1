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

  # Ensure kubectl is available
  $kubectlCmd = Get-Command kubectl -ErrorAction SilentlyContinue
  if (-not $kubectlCmd) {
    Write-Host "kubectl not found in PATH. Install kubectl and ensure it's on PATH: https://kubernetes.io/docs/tasks/tools/"
    exit 2
  }
  $kubectlPath = $kubectlCmd.Source

  $pf = @{}
  foreach ($r in $rules) {
    $name = $r.name
    $target = $r.kubeTarget
    $ns = $r.namespace
    $local = $r.localPort
    $remote = $r.remotePort
    Write-Host "Starting port-forward $name -> $target ($($local):$($remote)) in ns $ns"
    $args = @('port-forward', $target, "$($local):$($remote)", '-n', $ns)
    try {
      $proc = Start-Process -FilePath $kubectlPath -ArgumentList $args -PassThru -WindowStyle Hidden
      if ($proc -and $proc.Id) {
        $pf[$name] = $proc.Id
        Write-Host "Started $name (PID $($proc.Id))"
      } else {
        Write-Host "Failed to start port-forward for $name"
      }
    } catch {
      Write-Host "Error starting port-forward for $name: $($_.Exception.Message)"
    }
    Start-Sleep -Milliseconds 200
  }
  try {
    $pf | ConvertTo-Json -Depth 3 | Out-File $pidFile -Encoding utf8 -Force
    Write-Host "Started port-forwards. PID file: $pidFile"
  } catch {
    Write-Host "Failed to write PID file: $($_.Exception.Message)"
  }
  exit 0
}

if ($Action -eq 'stop') {
  if (!(Test-Path $pidFile)) { Write-Host "No port-forward PID file found at $pidFile"; exit 0 }
  $pf = Get-Content $pidFile -Raw | ConvertFrom-Json
  foreach ($prop in $pf.psobject.Properties) {
    $name = $prop.Name
    $procId = $prop.Value
    try {
      if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Write-Host "Stopped $name (PID $procId)"
      } else {
        Write-Host "Process for $name (PID $procId) not found; skipping"
      }
    } catch {
      Write-Host ("Failed to stop {0}: {1}" -f $name, $_.Exception.Message)
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  Write-Host "Stopped all port-forwards"
  exit 0
}

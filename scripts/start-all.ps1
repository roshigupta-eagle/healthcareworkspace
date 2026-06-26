<#
Start all development services for this workspace.

Usage: run from repository root
  .\scripts\start-all.ps1

What it does:
 - Starts `ehr` (Next.js) via `npm run dev` if `ehr/` exists
 - Starts Go services with `make run` for `fhir`, `lims`, `pharmacyms` if present
 - Saves started PIDs to `.run/pids.json`

Requirements: PowerShell (Windows), npm, make, go in PATH
#>

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path "$PSScriptRoot/.."
$repoRoot = $repoRoot.Path
$runDir = Join-Path $repoRoot '.run'
if (!(Test-Path $runDir)) { New-Item -ItemType Directory -Path $runDir | Out-Null }

$pids = @{}

function Start-ServiceProcess {
  param(
    [string]$name,
    [string]$workdir,
    [string]$cmd
  )
  Write-Host "Starting $name in $workdir ..."
  $argList = @("-NoExit", "-Command", "Set-Location -Path '$workdir'; $cmd")
  $proc = Start-Process -FilePath "powershell.exe" -ArgumentList $argList -PassThru
  $pids[$name] = $proc.Id
  Start-Sleep -Milliseconds 300
}

# EHR (Next.js)
$ehrPath = Join-Path $repoRoot 'ehr'
if (Test-Path $ehrPath) {
  Start-ServiceProcess -name 'ehr' -workdir $ehrPath -cmd 'npm run dev'
}

# Go services (use Makefile run target)
foreach ($svc in @('fhir','lims','pharmacyms')) {
  $svcPath = Join-Path $repoRoot $svc
  if (Test-Path $svcPath -and Test-Path (Join-Path $svcPath 'Makefile')) {
    Start-ServiceProcess -name $svc -workdir $svcPath -cmd 'make run'
  }
}

# Persist PIDs
$pids | ConvertTo-Json | Out-File (Join-Path $runDir 'pids.json') -Encoding utf8
Write-Host "Started services. PID file: $(Join-Path $runDir 'pids.json')"

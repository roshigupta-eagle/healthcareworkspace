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

Write-Host "Delegating to manage-services.ps1 (start all)"
$manageScript = Join-Path $PSScriptRoot 'manage-services.ps1'
if (Test-Path $manageScript) {
  & $manageScript -Action start -Component all
} else {
  Write-Host "manage-services.ps1 not found. Please run manage-services.ps1 directly or restore this script."
}

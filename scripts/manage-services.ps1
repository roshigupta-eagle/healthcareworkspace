<#
Manage development services for this workspace.

Supported actions: start, stop, restart, status
Supported components: ehr, fhir, lims, pharmacyms, postgres

Usage examples:
  .\scripts\manage-services.ps1 -Action status
  .\scripts\manage-services.ps1 -Action start -Component all
  .\scripts\manage-services.ps1 -Action start -Component ehr

This script is intentionally simple and ASCII-only to avoid PowerShell
parsing/encoding issues on older hosts.
#>

$ErrorActionPreference = 'Stop'

# Use manual argument parsing to maximize compatibility across PowerShell versions
$Action = 'status'
$Component = 'all'
$Force = $false
$Help = $false

for ($i = 0; $i -lt $args.Length; $i++) {
    $a = $args[$i]
    if ($a -eq '-Action' -or $a -eq '/Action' -or $a -eq '-action') {
        if ($i + 1 -lt $args.Length) { $Action = $args[$i + 1]; $i++ }
    } elseif ($a -eq '-Component' -or $a -eq '/Component' -or $a -eq '-component') {
        if ($i + 1 -lt $args.Length) { $Component = $args[$i + 1]; $i++ }
    } elseif ($a -eq '-Force' -or $a -eq '/Force' -or $a -eq '-force') {
        $Force = $true
    } elseif ($a -eq '-Help' -or $a -eq '/Help' -or $a -eq '-help') {
        $Help = $true
    }
}

if ($Help) {
    $scriptPath = $MyInvocation.MyCommand.Path
    Get-Content -Path $scriptPath -Raw | Select-String -Pattern '^#' -Context 0,0 | ForEach-Object { $_.Line }
    exit 0
}

function Write-Log([string]$msg) { Write-Host "[manage-services] $msg" }

$repoRoot = Resolve-Path "$PSScriptRoot\.."; $repoRoot = $repoRoot.Path
$runDir = Join-Path $repoRoot '.run'
if (-not (Test-Path $runDir)) { New-Item -ItemType Directory -Path $runDir | Out-Null }
$pidsFile = Join-Path $runDir 'pids.json'

$pids = @{}

function Load-Pids {
    if (Test-Path $pidsFile) {
        try {
            $txt = Get-Content $pidsFile -Raw
            if ($txt.Trim().Length -gt 0) {
                $obj = $txt | ConvertFrom-Json
                foreach ($prop in $obj.PSObject.Properties) { $pids[$prop.Name] = $prop.Value }
            }
        } catch { Write-Log "Failed to load PID file: $_"; $pids = @{} }
    }
}

function Save-Pids {
    try { $pids | ConvertTo-Json | Out-File -FilePath $pidsFile -Encoding utf8 } catch { Write-Log "Failed to save PIDs: $_" }
}

function Is-ProcRunning($procId) {
    if (-not $procId) { return $false }
    try { Get-Process -Id ([int]$procId) -ErrorAction Stop | Out-Null; return $true } catch { return $false }
}

function Check-PortOpen($port) {
    try { $res = Test-NetConnection -ComputerName '127.0.0.1' -Port $port -WarningAction SilentlyContinue; return [bool]$res.TcpTestSucceeded } catch { return $false }
}

function Service-Status($name) {
    if ($name -eq 'postgres') {
        $open = Check-PortOpen 5432
        if ($open) { $details = 'tcp/5432 open' } else { $details = 'tcp/5432 closed' }
        return [PSCustomObject]@{ name = $name; running = $open; pid = $null; details = $details }
    }

    if ($pids.ContainsKey($name)) {
        $procId = $pids[$name]
        $running = Is-ProcRunning $procId
        if ($running) { $procIdVal = $procId } else { $procIdVal = $null }
        return [PSCustomObject]@{ name = $name; running = $running; pid = $procIdVal; details = $null }
    }

    return [PSCustomObject]@{ name = $name; running = $false; pid = $null; details = $null }
}

function Start-Component($name) {
    switch ($name) {
        'ehr' {
            $path = Join-Path $repoRoot 'ehr'
            if (-not (Test-Path $path)) { Write-Log 'ehr folder not found; skipping'; return }
            Write-Log "Starting ehr (Next.js) in $path ..."
            $cmd = "Set-Location -Path '$path'; npm run dev"
            $proc = Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit','-Command',$cmd -PassThru
            $pids['ehr'] = $proc.Id; Save-Pids; return
        }
        'fhir' { Start-ServiceWithMake $name; return }
        'lims' { Start-ServiceWithMake $name; return }
        'pharmacyms' { Start-ServiceWithMake $name; return }
        'postgres' {
            # If a Postgres server is already accepting connections on 5432, skip start
            if (Check-PortOpen 5432) { Write-Log 'Postgres is already accepting connections on 127.0.0.1:5432; skipping start.'; return }

            $docker = Get-Command docker -ErrorAction SilentlyContinue
            if (-not $docker) { Write-Log 'Docker not found; please start Postgres manually.'; return }
            $containerName = 'healthcare_postgres'
            $exists = & docker ps -a --filter "name=$containerName" --format '{{.Names}}' 2>$null
            if ($exists -and $exists.Trim()) {
                $running = & docker ps --filter "name=$containerName" --format '{{.Names}}' 2>$null
                if ($running -and $running.Trim()) { Write-Log "Postgres container '$containerName' already running."; return }
                Write-Log "Starting existing Postgres container '$containerName'..."
                & docker start $containerName | Out-Null
            } else {
                Write-Log "Creating and starting Postgres container '$containerName' (postgres:16)..."
                & docker run -d --name $containerName -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=fhir_dev -v "$runDir/postgres_data:/var/lib/postgresql/data" postgres:16 | Out-Null
            }
            for ($i=0; $i -lt 20; $i++) { if (Check-PortOpen 5432) { Write-Log 'Postgres is accepting connections'; return } Start-Sleep -Seconds 1 }
            Write-Log 'Postgres did not become ready in time.'
            return
        }
        default { Write-Log "Unknown component: $name"; return }
    }
}

function Start-ServiceWithMake($name) {
    $path = Join-Path $repoRoot $name
    if (-not (Test-Path $path)) { Write-Log "$name folder not found; skipping"; return }
    Write-Log "Starting $name in $path ..."
    $full = "Set-Location -Path '$path'; make run"
    $proc = Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit','-Command',$full -PassThru
    $pids[$name] = $proc.Id; Save-Pids
}

function Stop-Component($name) {
    if ($name -eq 'postgres') {
        $docker = Get-Command docker -ErrorAction SilentlyContinue
        if ($docker) {
            $containerName = 'healthcare_postgres'
            $exists = & docker ps -a --filter "name=$containerName" --format '{{.Names}}' 2>$null
            if ($exists -and $exists.Trim()) { Write-Log "Stopping Postgres container '$containerName'..."; & docker stop $containerName | Out-Null } else { Write-Log 'Postgres container not present; skipping' }
        } else { Write-Log 'Docker not found; cannot stop Postgres container' }
        return
    }
    if ($pids.ContainsKey($name)) {
        $procId = $pids[$name]
        if (Is-ProcRunning $procId) {
            Write-Log "Stopping $name (PID $procId) ..."
            try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 200 } catch { }
        } else { Write-Log "$name PID $procId not running" }
        $pids.Remove($name) | Out-Null
        Save-Pids
    } else { Write-Log "No PID recorded for $name; nothing to stop" }
}

function Do-Action($action, $names) {
    foreach ($n in $names) {
        $s = Service-Status $n
        switch ($action) {
            'status' {
                if ($s.running) { $statusText = 'running' } else { $statusText = 'stopped' }
                if ($s.pid) { $extra = "pid=$($s.pid)" } elseif ($s.details) { $extra = $s.details } else { $extra = '' }
                Write-Host ("{0,-12} {1,-8} {2}" -f $n, $statusText, $extra)
            }
            'start' {
                if ($s.running) {
                    if ($Force) {
                        Write-Log "$n is running; force requested - restarting"
                        Stop-Component $n
                        Start-Component $n
                    } else {
                        Write-Log "$n already running; skipping"
                    }
                } else {
                    Start-Component $n
                }
            }
            'stop' { Stop-Component $n }
            'restart' { Stop-Component $n; Start-Sleep -Milliseconds 300; Start-Component $n }
        }
    }
}

# main
Load-Pids

$allComponents = @('ehr','fhir','lims','pharmacyms','postgres')
$names = @()
if ($Component -eq 'all') { $names = $allComponents } else { $names = $Component -split ',' | ForEach-Object { $_.Trim() } }

Do-Action $Action $names

Write-Log 'Done.'

Skill: manage-services

Description:
- Provides instructions and automation for starting, stopping, restarting, and checking the status of local development services used by the healthcareworkspace monorepo.
- Wraps the PowerShell script `scripts/manage-services.ps1` which supports per-component operations and a `postgres` helper that will attempt to use Docker if available.

When to use:
- Local development when you need a single command to bring up or inspect the EHR frontend (`ehr`), Go services (`fhir`, `lims`, `pharmacyms`), and a development Postgres instance.
- CI job steps that must ensure services are up before running integration tests (call the script with `-Action start -Component <name>` and then poll `-Action status`).

Files created/updated:
- `scripts/manage-services.ps1` — main manager script (start/stop/restart/status, per-component control)
- `scripts/start-all.ps1` — now delegates to `manage-services.ps1`
- `scripts/README.md` — documentation updated with usage examples

Usage examples (PowerShell):

- Show status for everything:

  .\scripts\manage-services.ps1 -Action status

- Start all services (frontend + backends + postgres if Docker available):

  .\scripts\manage-services.ps1 -Action start -Component all

- Start only the EHR frontend:

  .\scripts\manage-services.ps1 -Action start -Component ehr

- Force a restart of the EHR frontend:

  .\scripts\manage-services.ps1 -Action restart -Component ehr -Force

Notes and cautions:
- The `postgres` helper will create a Docker container named `healthcare_postgres` if one does not already exist. This is intended for local development only.
- The script stores wrapper PIDs under `.run/pids.json`. `stop`/`restart` operations use those entries to stop the launched windows/processes.
- This script is written for PowerShell on Windows. It can be used from WSL/Unix shells by invoking PowerShell explicitly. Cross-platform sh wrappers can be added if required.

Master dev scripts

Files:
- `start-all.ps1` - Start known services (EHR frontend, Go services) in separate PowerShell windows and save PIDs to `.run/pids.json`.
- `stop-all.ps1` - Stop processes started by `start-all.ps1` using the PID file.
- `port-forward.ps1` - Start/stop kubectl port-forwards described in `port-forward.config.json`.
- `port-forward.config.json` - sample port-forward rules.

Usage (PowerShell, from repository root):

Start everything:

```powershell
.\scripts\start-all.ps1
```

Stop everything:

```powershell
.\scripts\stop-all.ps1
```

Start port-forwards:

```powershell
.\scripts\port-forward.ps1 start
```

Stop port-forwards:

```powershell
.\
cripts\port-forward.ps1 stop
```

Notes:
- These scripts open new PowerShell windows for each service (so you can see logs interactively).
- They store runtime PIDs under `.run/` so `stop-all.ps1` can stop them later.
- Adjust the services list in `start-all.ps1` if you have additional components to run.

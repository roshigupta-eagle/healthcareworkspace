---
skill: hdl-deploy
module: hdl
version: 1.0.0
type: workflow
description: >
  Deploy the HAPI FHIR R4 server and project profiles locally using Docker Compose.
  Runs readiness polling, profile registration, smoke tests, and generates an HTML
  deployment report. Also supports graceful teardown.
---

# hdl-deploy

Deploy and validate the local HAPI FHIR R4 environment for the active healthcare project.

---

## Capabilities

| User says | Capability |
|---|---|
| "deploy", "start FHIR server", "bring up HAPI" | [Deploy](#deploy) |
| "smoke test", "validate deployment", "ping FHIR" | [Smoke Test](#smoke-test) |
| "teardown", "stop FHIR", "bring down" | [Teardown](#teardown) |
| "deployment report", "show deploy status" | [Deployment Report](#deployment-report) |

---

## Deploy

### Pre-conditions

Verify these before deploying:

| Check | Command | Expected |
|---|---|---|
| Docker running | `docker info` | No error |
| Docker Compose available | `docker compose version` | Version string |
| docker-compose.yml present | File exists at `infrastructure/docker-compose.yml` | Yes |
| QA gate passed | `delivery-state.md` qa phase gate = `PASS` | Yes |

If any check fails, print the failure and halt with instructions to fix.

### Steps

**Step 1 — Read configuration**

Read `_bmad/config.toml` `[modules.hdl]` section. Extract:
- `hapi_port` (default: `8080`)
- `project_name`
- `ig_publisher_path` (if set — used for profile registration)

**Step 2 — Start containers**

Run in terminal:
```
docker compose -f infrastructure/docker-compose.yml up -d
```

Capture stdout/stderr. If exit code ≠ 0, log the error, update `delivery-state.md` deploy
gate to `FAIL`, and halt.

**Step 3 — Readiness polling**

Poll `http://localhost:{hapi_port}/fhir/metadata` until:
- Response is HTTP 200 with `resourceType: CapabilityStatement`
- **Timeout:** 120 seconds
- **Interval:** 5 seconds
- **Max attempts:** 24

Run in terminal:
```python
# Use this Python polling loop:
python3 -c "
import urllib.request, time, json, sys

port = {hapi_port}
url = f'http://localhost:{port}/fhir/metadata'
timeout = 120
interval = 5
attempts = timeout // interval

for i in range(attempts):
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            body = json.loads(r.read())
            if body.get('resourceType') == 'CapabilityStatement':
                print(f'READY after {(i+1)*interval}s')
                sys.exit(0)
    except Exception as e:
        print(f'Attempt {i+1}/{attempts}: {e}')
    time.sleep(interval)

print('TIMEOUT: HAPI FHIR did not become ready within 120s')
sys.exit(1)
"
```

If timeout: update deploy gate to `FAIL`, write to deployment-log, halt.

**Step 4 — Profile registration** _(only if `ig_publisher_path` is configured)_

If `ig_publisher_path` is set and `output/` directory exists under it:

Run in terminal:
```
for f in {ig_publisher_path}/output/*.json; do
  curl -s -o /dev/null -w "%{http_code} $f\n" -X PUT \
    -H "Content-Type: application/fhir+json" \
    "http://localhost:{hapi_port}/fhir/$(jq -r .resourceType $f)/$(jq -r .id $f)" \
    -d @"$f"
done
```

Log each HTTP response code. If any return 4xx/5xx, log the error but do not halt
(profiles are optional for smoke test pass).

**Step 5 — Run smoke tests** (see [Smoke Test](#smoke-test))

**Step 6 — Write deployment manifest**

Create `_bmad/memory/hdl/deploy/deployment-manifest.md`:

```markdown
# Deployment Manifest — {project_name}

**Date:** {date}
**HAPI FHIR Version:** R4 (hapiproject/hapi:latest)
**Port:** {hapi_port}
**Docker Compose:** infrastructure/docker-compose.yml
**Status:** SUCCESS

## Containers

| Container | Image | Port | Status |
|---|---|---|---|
| hapi-fhir | hapiproject/hapi:latest | {hapi_port}:8080 | running |

## Profile Registration

| File | Resource | HTTP Status |
|---|---|---|
{profile_rows}

## Smoke Test Results

{smoke_test_summary}
```

**Step 7 — Append to deployment log**

Append to `_bmad/memory/hdl/deploy/deployment-log.md`:
```
## {date} — Deploy

- Started: {start_time}
- HAPI ready: {ready_time} ({elapsed}s)
- Profiles registered: {profile_count}
- Smoke tests: {pass}/{total} passed
- Overall: SUCCESS / FAILURE
```

**Step 8 — Update delivery state**

Update `delivery-state.md`:
- Set deploy phase gate to `PASS` (if all smoke tests pass) or `FAIL`
- Append Gate History row

**Step 9 — Generate HTML report** (see [Deployment Report](#deployment-report))

---

## Smoke Test

Verify the HAPI FHIR server is functioning correctly after deployment.

### Tests

Run these tests in order. Each is a direct HTTP call. Capture HTTP status and
response body snippet.

| Test ID | Description | Method | Path | Expected |
|---|---|---|---|---|
| SMOK-001 | CapabilityStatement | GET | `/fhir/metadata` | 200 + `resourceType: CapabilityStatement` |
| SMOK-002 | Create Patient | POST | `/fhir/Patient` | 201 + `resourceType: Patient` |
| SMOK-003 | Read Patient back | GET | `/fhir/Patient/{id}` | 200 + same id |
| SMOK-004 | Search Patient by name | GET | `/fhir/Patient?name=TestPatient` | 200 + Bundle |
| SMOK-005 | Create Observation | POST | `/fhir/Observation` | 201 + `resourceType: Observation` |
| SMOK-006 | Delete test Patient | DELETE | `/fhir/Patient/{id}` | 200 or 204 |
| SMOK-007 | Delete test Observation | DELETE | `/fhir/Observation/{id}` | 200 or 204 |

**Test Patient payload (SMOK-002):**
```json
{
  "resourceType": "Patient",
  "name": [{ "family": "TestPatient", "given": ["HDLSmoke"] }],
  "birthDate": "2000-01-01",
  "gender": "unknown"
}
```

**Test Observation payload (SMOK-005):**
```json
{
  "resourceType": "Observation",
  "status": "final",
  "code": { "coding": [{ "system": "http://loinc.org", "code": "29463-7", "display": "Body weight" }] },
  "subject": { "reference": "Patient/{patient_id}" },
  "valueQuantity": { "value": 70, "unit": "kg", "system": "http://unitsofmeasure.org", "code": "kg" }
}
```

Run each test using `curl` or the Python `urllib` module. Record pass/fail.

If SMOK-001 fails: halt all other tests — server is not responding.

### Output

```
─────────────────────────────────────────────
  SMOKE TESTS — {project_name}
─────────────────────────────────────────────
  SMOK-001  CapabilityStatement       ✓ PASS
  SMOK-002  Create Patient            ✓ PASS
  SMOK-003  Read Patient              ✓ PASS
  SMOK-004  Search Patient            ✓ PASS
  SMOK-005  Create Observation        ✓ PASS
  SMOK-006  Delete Patient            ✓ PASS
  SMOK-007  Delete Observation        ✓ PASS
─────────────────────────────────────────────
  Result: 7/7 PASS
─────────────────────────────────────────────
```

---

## Teardown

Stop and remove containers. Does not delete volumes (data is preserved).

### Steps

1. Run in terminal:
   ```
   docker compose -f infrastructure/docker-compose.yml down
   ```
2. Confirm containers are stopped.
3. Append to `deployment-log.md`:
   ```
   ## {date} — Teardown
   - Stopped at: {time}
   - Volumes preserved: yes
   ```
4. Update `delivery-state.md` deploy phase status to `stopped` (keep gate status unchanged).

To also remove volumes (destructive — ask user to confirm first):
```
docker compose -f infrastructure/docker-compose.yml down -v
```

---

## Deployment Report

Write `_bmad-output/deploy/deployment-report-{date}.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{project_name} — Deployment Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f5f5f5; }
  .header { background: {header_color}; color: white; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 1.4rem; }
  .header p { margin: 4px 0 0; opacity: 0.8; font-size: 0.9rem; }
  .badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-weight: 700;
           background: rgba(255,255,255,0.2); margin-left: 12px; }
  .container { max-width: 900px; margin: 32px auto; padding: 0 16px; }
  .card { background: white; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .card h2 { margin-top: 0; color: #1e3a5f; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 8px 12px; background: #f0f0f0; font-size: 0.8rem;
       text-transform: uppercase; color: #555; }
  td { padding: 8px 12px; border-top: 1px solid #eee; font-size: 0.875rem; }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
  .pill-pass { background: #dcfce7; color: #15803d; }
  .pill-fail { background: #fee2e2; color: #b91c1c; }
  .footer { text-align: center; color: #aaa; font-size: 0.75rem; padding: 16px 0 32px; }
</style>
</head>
<body>
<div class="header">
  <h1>{project_name} — Deployment Report <span class="badge">{overall_status}</span></h1>
  <p>{date} | HAPI FHIR R4 | Port {hapi_port}</p>
</div>
<div class="container">

  <div class="card">
    <h2>Deployment Summary</h2>
    <table>
      <tr><th>Item</th><th>Value</th></tr>
      <tr><td>Docker Compose</td><td>infrastructure/docker-compose.yml</td></tr>
      <tr><td>HAPI image</td><td>hapiproject/hapi:latest</td></tr>
      <tr><td>Port</td><td>{hapi_port}</td></tr>
      <tr><td>Ready time</td><td>{ready_elapsed}s</td></tr>
      <tr><td>Profiles registered</td><td>{profile_count}</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>Smoke Tests</h2>
    <table>
      <thead><tr><th>Test ID</th><th>Description</th><th>HTTP</th><th>Result</th></tr></thead>
      <tbody>{smoke_rows}</tbody>
    </table>
  </div>

  {profile_card}

  <div class="footer">Healthcare SDLC Delivery Suite — hdl-deploy — {date}</div>
</div>
</body>
</html>
```

`header_color`: `#16a34a` for SUCCESS, `#dc2626` for FAILURE.

Print summary after writing:

```
─────────────────────────────────────────────
  HDL DEPLOY COMPLETE
─────────────────────────────────────────────
  HAPI FHIR  : http://localhost:{hapi_port}/fhir
  Status     : {SUCCESS | FAILURE}
  Smoke tests: {pass}/{total}
  Report     : _bmad-output/deploy/deployment-report-{date}.html
─────────────────────────────────────────────
  Gate DEPLOY-001–004 status: {gate_result}
─────────────────────────────────────────────
```

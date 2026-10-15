# Runbook — telehealth-browser-media

**Date:** 2026-09-28
**Scope:** local development only; synthetic participants only.

## Start local media stack

```powershell
# Shell 1: LiveKit SFU
.\.tools\livekit\livekit-server.exe --dev

# Shell 2: Go control plane
$env:CALL_PROVIDER_MODE = 'live'
$env:CALL_PROVIDER = 'livekit'
$env:CALL_ALLOW_EPHEMERAL_LIVE = 'true'
$env:CALL_PROVIDER_BASE_URL = 'http://127.0.0.1:7880'
$env:CALL_PROVIDER_API_KEY = 'devkey'
$env:CALL_PROVIDER_API_SECRET = 'secret'
$env:COMMUNICATION_SERVICE_AUTH_TOKEN = 'development-only-token'
Push-Location .\communication
go run .\cmd\server

# Shell 3: EHR BFF
$env:CALL_PROVIDER_MODE = 'live'
$env:COMMUNICATION_SERVICE_URL = 'http://127.0.0.1:8083'
$env:COMMUNICATION_SERVICE_AUTH_TOKEN = 'development-only-token'
$env:COMMUNICATION_TENANT_ID = 'development'
$env:COMMUNICATION_ORGANIZATION_ID = 'development'
Push-Location .\ehr
npm run dev
```

## Local smoke test

1. Start a new call from the Communication Hub with the local LiveKit provider enabled.
2. Open `/telehealth/calls/{callId}/meeting?asUser=dev&patientId=patient-001`.
3. Select **Join meeting**, approve device permissions, then open **Open synthetic Sarah participant** in a second local tab.
4. Approve its device permissions and verify each tab shows the other participant's media.
5. Leave both meetings. Do not treat this as a clinical call completion or production evidence.

## Rollback

Stop the EHR, control plane, and LiveKit processes. Restart EHR/control plane with `CALL_PROVIDER_MODE=mock` for simulated calls or `disabled` for truthful provider-unavailable behavior. Delete no call history; local ephemeral live sessions are intentionally process-bound.

## Production prohibition

Do not use `devkey`/`secret`, `CALL_ALLOW_EPHEMERAL_LIVE`, local loopback URLs, synthetic guest access, or this runbook outside local development.

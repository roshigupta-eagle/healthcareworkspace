# Operations and Monitoring — telehealth-browser-media

**Status:** local developer observability only.

## Local signals

- LiveKit process listening on `127.0.0.1:7880`.
- Communication control plane listening on `8083` with structured redacted logs.
- EHR BFF listening on `3000`.
- Browser status: disconnected, connecting, connected, reconnecting, or local error.

## Production gaps

No dashboards, alerting, tracing, signed webhooks, provider SLOs, TURN telemetry, retention policy, incident ownership, or production runbook are implemented. The local `devkey`/`secret` pair and ephemeral store are prohibited outside developer testing.
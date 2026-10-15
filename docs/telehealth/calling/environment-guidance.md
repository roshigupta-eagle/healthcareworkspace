# Telehealth Calling Environment and Configuration Guidance

**Status:** local call-control and a synthetic LiveKit browser-media proof are implemented. No production deployment, durable live-mode store, TURN validation, or production media path is created by this document.

## Implemented local call-control modes

The EHR calls the Go `communication` service from server code only. The browser never receives `COMMUNICATION_SERVICE_AUTH_TOKEN`, provider API credentials, or a LiveKit signing secret.

| Mode | Required settings | Result |
|---|---|---|
| `disabled` | None | New calls return a truthful provider-unavailable problem. |
| `mock` | `CALL_PROVIDER_MODE=mock`, matching `COMMUNICATION_SERVICE_AUTH_TOKEN` in both services | The control plane simulates the call lifecycle for synthetic development data. It does not create or join real media. |
| `live` | `CALL_PROVIDER_MODE=live`, `CALL_PROVIDER=livekit`, `CALL_PROVIDER_BASE_URL`, `CALL_PROVIDER_API_KEY`, `CALL_PROVIDER_API_SECRET`, `DATABASE_URL`, and matching `COMMUNICATION_SERVICE_AUTH_TOKEN` | The control plane creates opaque LiveKit rooms and can issue short-lived, participant-scoped browser join tokens through the EHR BFF. |

For a deliberately ephemeral local proof only, `CALL_ALLOW_EPHEMERAL_LIVE=true` permits live mode without `DATABASE_URL` outside production. It is rejected in production and must never be used as a durable or shared environment configuration.

The EHR additionally requires `COMMUNICATION_SERVICE_URL`. In live mode it also requires `COMMUNICATION_TENANT_ID` and `COMMUNICATION_ORGANIZATION_ID`. The Go service validates enabled-mode configuration at startup; mock mode is intentionally rejected in production.

For a local mock smoke test, use only synthetic data and a development-only shared token:

```powershell
# Terminal 1: communication control plane
$env:CALL_PROVIDER_MODE = 'mock'
$env:COMMUNICATION_SERVICE_AUTH_TOKEN = 'development-only-token'
$env:PORT = '8083'
Push-Location .\communication
go run .\cmd\server

# Terminal 2: EHR
$env:CALL_PROVIDER_MODE = 'mock'
$env:COMMUNICATION_SERVICE_URL = 'http://127.0.0.1:8083'
$env:COMMUNICATION_SERVICE_AUTH_TOKEN = 'development-only-token'
Push-Location .\ehr
npm run dev
```

Provider room IDs are opaque derived identifiers; do not include patient, clinician, encounter, or other PHI in provider metadata or logs.

## Environment separation

| Environment | Intended purpose | Required isolation | Current evidence |
|---|---|---|---|
| Local | Developer workflow with synthetic data and disabled, mock, or explicitly configured LiveKit states. | Separate local database/configuration, synthetic identities, non-production media/TURN credentials, and local-only LiveKit development keys. | The EHR-to-Go call-control bridge, mock provider, local LiveKit server, scoped join grants, and two-browser signaling proof are implemented. Browser device publishing requires human permission and TURN/event-bus configuration is absent. |
| Development | Shared integration validation. | Dedicated secrets, database/schema, provider project, URLs, device/test identities, audit boundary. | Unverified. |
| Test | Automated integration, security, failure, and browser testing. | Isolated data/credentials and reproducible fixtures; no production endpoints. | Unverified. |
| Staging | Production-like operational rehearsal. | Separate tenancy, certificates, media/TURN topology, monitoring, and non-production test identities. | Unverified. |
| Production | Approved clinical service. | Independently governed credentials, data plane, deployment, audit, support, backup/restore, network controls, and release approval. | Not implemented. |

Never reuse production media signing keys, TURN credentials, push keys, database credentials, or real patient data in local/test environments.

## Component selection record

| Responsibility | Current local state | Target decision rule |
|---|---|---|
| Calling control plane | Next.js route plus JSON local-development store. | A Go/PostgreSQL service behind the compatible EHR facade after architecture, migration, and operational approval. |
| Durable data | EHR Prisma schema declares PostgreSQL clinical models; calling data is not durable canonical state. | Use the approved PostgreSQL/PgBouncer model for CallSession and outbox state; do not duplicate canonical Patient data. |
| Media | No provider configured. | Select/approve an isolated LiveKit or equivalent adapter; server-side tokens only. |
| TURN | No configured topology. | Use selected provider support first; add dedicated Coturn only for documented scale/failure-domain requirements. |
| Realtime application events | Process-local participant-filtered SSE. | Reuse an approved cross-process platform if adequate; otherwise evaluate a dedicated option. It is not media or durable truth. |
| Durable event transport | No communication event bus/worker confirmed. | Prefer existing approved event backbone; evaluate NATS JetStream or Kafka only after inventory. |
| Cache/coordination | Project context names Redis, but communication calling has no confirmed deployment. | Use only for ephemeral coordination, rate limits, or provider needs; no clinical truth. |
| Observability | No calling telemetry stack is confirmed. | Use existing approved tracing/metrics/logging/deployment conventions; do not fabricate a parallel stack. |

## Configuration contract

The future calling service should use the repository's selected typed configuration pattern. The following names are conceptual configuration groups, not a request to commit values or secrets:

```text
TELEHEALTH_ENABLED
CALL_HISTORY_READ_MODEL
CALL_IDEMPOTENCY_TTL
CALL_RING_TIMEOUT
CALL_MEDIA_TOKEN_TTL
CALL_PROVIDER_*                 # endpoint/region/key reference, never signing secret in logs
CALL_TURN_*                     # credential reference/URLs, never raw credentials in source
CALL_REALTIME_*                 # provider endpoint/audience/channel signing reference
CALL_EVENT_BUS_*                # approved transport settings
CALL_DATABASE_*                 # approved connection/timeout/pool configuration
CALL_OTEL_* / CALL_METRICS_*    # telemetry endpoints and sampling policy
CALL_FEATURE_*                  # video, screen-share, group-call flags
```

Startup validation must fail fast only for enabled capabilities that cannot start safely. It must not make provider-independent history unavailable merely because LiveKit, TURN, realtime, or push delivery is unavailable. Health/readiness must distinguish a database outage from a degraded media provider.

## Secrets and identity handling

- Load all secrets from the approved secret store or local developer-secret mechanism; never commit them, add them to images, echo them in logs, or expose media signing keys to browsers.
- Use server-issued, short-lived, scoped media credentials with opaque user and room identities.
- Scope service identities by environment, tenant/organization policy, intended provider API, and least privilege.
- Rotate credentials, certificates, webhook signing secrets, and push keys through an owned procedure; rotation cadence and owner are unverified.
- Use TLS for all production signaling/API traffic. Certificate issuer, lifecycle and alerting approach require platform-owner confirmation.

## Local infrastructure guidance

The calling prompt permits a `docker-compose.telehealth.yml` or equivalent only after selection of required components. Do not add containers simply because they are named in the target architecture.

If a local integration stack is later approved, it should contain only the selected subset of PostgreSQL, Redis, LiveKit, NATS/Kafka, Centrifugo/realtime gateway, and TURN. It must use synthetic identities, isolated volumes/networks, non-production credentials, documented health probes, and a one-command startup procedure. A real browser media test still requires approved test devices/network configuration and cannot be inferred from container health.

## Release and operational prerequisites

Before promoting beyond local behavior, record all of the following:

1. Service/module owner, deployment mechanism, repository location, migration owner, and backward-compatible EHR facade contract.
2. Database HA, backup, PITR, restore testing, retention, encryption, tenant isolation, connection pooling, and approved RPO/RTO.
3. Media/TURN hosting, data-residency, UDP/port/firewall requirements, capacity plan, credentials, webhook verification, incident owner, and browser/network test evidence.
4. Realtime/event/push platform selection, opaque authorization model, retry/dead-letter behavior, failure isolation, and audit treatment.
5. IAM, patient-access, proxy/caregiver/interpreter, consent, recording, privacy, and clinical safety policies.
6. Telemetry, log redaction, dashboards, alerts, runbooks, deployment rollback, and security/compliance approval.

## Feature flags and safe degradation

Use an existing feature-flag mechanism, if one is approved, for video, screen sharing, group calling, recording, and future SIP. A disabled flag must surface a truthful unavailable state, not silently route to an unapproved provider. Safe degradation is:

```text
database unavailable          -> controlled CALL_STORE_UNAVAILABLE; no fabricated history
media provider unavailable    -> history remains readable; new media action returns controlled unavailable error
realtime/push unavailable     -> committed call remains; ringing delivery is visibly degraded/retried
TURN unavailable              -> no claim of fallback; connection attempt reports actionable, PHI-safe state
```

## Open decisions

The following are intentionally unresolved: actual production/database topology, event/realtime provider, media and TURN host/region, secret store, mobile/push clients, certificates, capacity/SLOs, RPO/RTO, data residency, and platform ownership. They require approved architecture and operations decisions rather than a local code change.

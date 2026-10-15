# Telehealth Calling Implementation Report

**Report status:** local implementation snapshot, not a production-completion report.
**Last updated:** 2026-09-28
**Scope reviewed:** repository-local EHR Communication Hub, local calling source changes, Go communication-module foundation, and calling documentation.

## Executive summary

The repository now provides a more complete but still local-development calling foundation, not a production telehealth calling platform. The EHR has a call-history/detail/action facade, call-focused workspace, explicit device-readiness page, and a local LiveKit meeting route. It calls the Go control plane through server-side credentials in explicit mock or LiveKit modes. In local live mode, Go creates opaque rooms and issues five-minute participant-scoped join grants; clinician and synthetic guest browser tabs have reached LiveKit connected state. This does not claim durable live-mode persistence, published camera/microphone evidence, TURN fallback, signed webhooks, production IAM, or clinical media readiness.

This report deliberately does **not** claim a live provider, a deployed PostgreSQL repository, an outbox worker, authenticated production handlers, deployed TURN/LiveKit, or FHIR integration. Those require separately provisioned infrastructure, approved identity and clinical policy, and operational evidence.

## Current implemented behavior

| Capability | Status | Evidence |
|---|---|---|
| Local Communication Hub | Implemented for synthetic development data. | `/communication` and `/communication/calls` use `UnifiedCommunicationHub`. |
| Local actor/session path | Partial/local only. | NextAuth session path plus explicit development/test `asUser=dev` seeded actor. |
| Start-call command | Implemented with explicit provider modes. | `POST /api/communication/v1/calls` persists a local auditable attempt, invokes the authenticated Go control plane when mock/live configuration is present, and returns a typed unavailable/provider problem when it is not. |
| Call-history/detail/action facade | Implemented locally. | `GET /api/communication/v1/calls`, `GET /api/communication/v1/calls/[callId]`, and constrained `PATCH` actions use the file-backed EHR development store with call state/history, local scope checks, pagination and idempotency evidence. |
| Call-focused UI and device readiness | Implemented locally. | `TelehealthCallWorkspace` renders the supplied Calls mode and links LiveKit-backed calls to a dedicated meeting route. The device-check page remains permission-based and independent from meeting join. |
| Local browser media | Implemented as a synthetic proof. | A server-only Go token issuer, EHR BFF join route, `livekit-client` meeting workspace, and local LiveKit server are wired. Two synthetic browser participants reached connected signaling state. Browser automation did not receive physical camera/microphone permission, so published-track evidence remains pending. |
| Media/ringing/TURN/push | Partial local implementation. | Local LiveKit room creation and browser signaling work; no TURN-only evidence, signed webhook, realtime-push, or production media deployment exists. |
| Go calling foundation | Implemented as local source and testable boundaries. | `communication/` contains domain/application code, authenticated call-control handlers, scoped repository adapters, mock/LiveKit provider boundaries, a Goose PostgreSQL schema migration, and health/readiness handlers; this is not a deployed service or provisioned PostgreSQL repository. |
| FHIR calling mapper/profiles | Not implemented. | FHIR mapping is gated by this report's [FHIR handoff](fhir-terminology-handoff.md). |
| Production operations/HA/DR | Not implemented. | No calling deployment, topology, backup/restore, dashboards, alerts, or provider incident evidence exists. |

## Components selected and rejected

| Category | Status | Notes |
|---|---|---|
| EHR `/api/communication/v1` browser facade | Retained target boundary. | Must remain backward compatible while the control plane evolves. |
| Local JSON store | Retained only as development compatibility seam. | Rejected as durable/multi-instance source of truth. |
| PostgreSQL calling control plane | Source adapter and migration only. | Scoped PostgreSQL repository source and a Goose schema migration exist; a provisioned/deployed persistent repository, tenancy operations, backup, and deployment approval are not evidenced. |
| LiveKit | Candidate/proposed, not selected/deployed. | Isolated media adapter only; no credentials/configuration. |
| Redis / SSE | Existing/project-context concepts, not selected as calling truth. | Redis/realtime are not durable clinical state or media transport. |
| NATS/Kafka/Centrifugo/Coturn | Unselected. | Reuse existing approved platform first; selection needs ADR/ownership. |
| Recording/transcription/AI/SIP/PSTN | Out of current scope. | Recording is disabled by default; no automatic transcription/AI. |

## API and event status

| Interface | Current status | Target requirement |
|---|---|---|
| `POST /api/communication/v1/calls` | Local provider-unavailable call attempt with idempotency. | Preserve compatibility; evolve to transition-validated control-plane command with truthful unavailable handling. |
| `GET /api/communication/v1/calls` | Local development list facade with cursor/limit/filter handling. | Govern a stable remote-service contract and validate its authorization and multi-instance behavior before integration. |
| `GET /api/communication/v1/calls/[callId]` and `PATCH /api/communication/v1/calls/[callId]` | Local development detail/action facade. | Preserve withheld/invalid-call behavior, idempotency and legal state transitions across any future remote boundary. |
| `/api/telehealth/v1/*` | Missing. | Proposed internal/control-plane family only after a compatibility/ADR decision. |
| `/api/communication/v1/events` | Process-local participant-filtered SSE. | Versioned, authorized cross-process notification capability after durable outbox/event design. |
| LiveKit webhook | Missing. | Signed, size-limited, replay-safe, idempotent provider-event endpoint. |

## Database and configuration changes

`communication/migrations/00001_telehealth_calling.sql` supplies a Goose PostgreSQL schema foundation for CallSession-related state, participants, history, waiting-room/device/consent/quality references, idempotency, and outbox records. The module also has scoped PostgreSQL repository source, a migration command, and configuration boundaries. This does not show that a database has been provisioned, that the migration has been run, that the repository is deployed, or that any outbox worker is operating. No provider settings, production secret, container deployment, TURN/LiveKit configuration, or infrastructure manifest is evidenced here.

## Phase-gate status

| Phase | Status | Evidence needed before completion |
|---|---|---|
| 1 — Foundation | Partially implemented locally; not production complete | EHR development facade/history/state evidence, source-level Go domain/repository/migration/probes, focused tests, and a production-approved persistence/authorization/outbox/deployment path still need proof. |
| 2 — Ringing | Not started | Real incoming notification, accept/decline/cancel/missed, atomic multi-device race. |
| 3 — Audio | Not started | Human-verifiable bidirectional media, real mute/end/history. |
| 4 — Reliability | Not started | TURN-only, reconnect, device switching, quality and audio-only fallback tests. |
| 5 — Video | Not started | Remote video, camera, screen share, adaptive/responsive behavior. |
| 6 — Group | Not started | Three independent authenticated participants, roles and moderation. |
| 7 — Workflow | Not started | Approved appointment/verification/consent/waiting-room/encounter/disposition/audit/FHIR integration. |
| 8 — Hardening | Not started | HA/DR, security, performance/load/chaos/browser/network/accessibility evidence and runbooks. |

## Test evidence

- Focused EHR regression coverage is present in `ehr/src/__tests__/clinicalCommunicationStore.test.ts` and `ehr/src/__tests__/communicationCallsRoute.test.ts` for call lifecycle, local scope, list/detail, pagination, idempotency, and provider-unavailable outcomes.
- `ehr/tests/e2e/communication-hub.spec.ts` includes a Chromium call-workspace/device-readiness scenario. It deliberately does not grant media permission or assert an active session, while checking the browser-only preflight controls render.
- The Go module includes domain, application, and health-handler tests. They exercise local code boundaries, not a provider, deployed database, worker, or authenticated HTTP path.
- Discovery-time local runtime evidence recorded `GET /api/communication/v1/calls?asUser=dev` as `405`; that is superseded by the current local source facade and retained only in [00-current-state-discovery.md](00-current-state-discovery.md) as a dated baseline. `POST` remains a controlled `503 TELEPHONY_UNAVAILABLE` while no provider is configured; see [01-503-root-cause.md](01-503-root-cause.md).
- No real audio, video, TURN, provider webhook, multi-device, failure-injection, FHIR, security, load, chaos, accessibility, or production deployment test has been performed for telehealth calling.

## Security, privacy and FHIR results

- The target threat model and FHIR/terminology handoff are documented, but controls have not been implemented or independently verified.
- CallSession remains operational and must not map technical state into `Communication.status`; no automatic FHIR projection is permitted.
- No compliance certification, data-residency finding, privacy impact assessment, recording approval, provider approval, or clinical safety sign-off exists.

## Known limitations and remaining risks

1. Mock mode simulates control-plane call state only. Live mode creates provider rooms but does not establish a browser media session without the still-missing join-token/client integration.
2. The EHR list/detail/action facade remains file-backed and local-process scoped; it is not a durable multi-instance calling control plane.
3. Local preview/session checks are not a production tenant/organization/care-team/consent/proxy policy engine.
4. No selected and deployed media, TURN, push, cross-process realtime, event bus, secret, topology, or operational owner exists.
5. The migration/source foundation is not proof of a provisioned database, deployed persistent repository, operational outbox worker, production audit/task integration, or migration/restore exercise.
6. No approved Ontario/program FHIR IG, terminology contract, mapping/profile validation, or partner conformance evidence exists.

## Production prerequisites and human actions required

Human owners must approve identity and patient-access policy; clinical workflow/consent/verification; provider/data-residency terms; network/firewall/UDP access; secrets and certificates; database/event/realtime/push/observability topology; capacity/SLO/RPO/RTO; deployment and incident ownership; FHIR/terminology profiles; privacy/security review; test identities and clinical safety release. These actions are intentionally not performed by repository documentation or local code.

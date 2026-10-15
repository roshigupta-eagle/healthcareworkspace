# Telehealth Calling Current-State Discovery

**Recorded:** 2026-09-20
**Scope:** repository inspection for the Roshi telehealth-calling implementation.
**Evidence level:** source and existing-document review only unless a row says otherwise. No production environment, provider account, network traversal path, database instance, gateway log, or real patient identity was accessed for this report.

> **Dated baseline:** This document preserves the discovery state observed before the local implementation work recorded in [the implementation report](implementation-report.md). References below to a missing calls `GET` route or Go calling module are therefore historical findings, not a claim about the current working tree. The implementation delta remains local-source evidence only; it is not evidence of a deployed telehealth service or a live call.

## Executive finding

At discovery, `/communication` was an EHR-hosted local-development Communication Hub, not a deployed telehealth platform. Its call action deliberately recorded a provider-unavailable fixture and responded with a controlled `503 TELEPHONY_UNAVAILABLE`. At that point it had no call-history `GET` endpoint, LiveKit/TURN integration, durable calling database, Go calling service, cross-process event backbone, push delivery, or production policy enforcement.

The post-baseline working tree now adds a local calls facade, a call-focused workspace and device-check route, focused test coverage, and a Go `communication/` foundation with a PostgreSQL repository adapter, migration command, and health/readiness probe boundaries. Those additions preserve truthful provider-unavailable behavior and do not establish LiveKit/TURN media, a deployed PostgreSQL repository, an outbox worker, authenticated production handlers, or a FHIR integration.

The implementation must preserve the browser-facing `/api/communication/v1` facade while introducing a compatible target calling control plane. It must not make the custom FHIR service, JSON fixture store, Redis, SSE, or a media provider authoritative for clinical call state.

## Evidence sources

- [Communication current-state audit](../../communications/CURRENT_STATE_AUDIT.md)
- [Communication HLD](../../communications/HLD.md) and [LLD](../../communications/LLD.md)
- [Communication PRD](../../communications/01_Roshi_Communication_PRD.md)
- `ehr/src/app/communication/`, `ehr/src/app/api/communication/v1/`, and `ehr/src/lib/clinicalCommunicationStore.ts`
- `ehr/package.json`, `ehr/prisma/schema.prisma`, `fhir/go.mod`, `fhir/internal/server/server.go`
- Post-baseline local-source delta: `ehr/src/app/telehealth/calls/[callId]/device-check/`, `ehr/src/__tests__/clinicalCommunicationStore.test.ts`, `ehr/src/__tests__/communicationCallsRoute.test.ts`, `ehr/tests/e2e/communication-hub.spec.ts`, and `communication/`

## Frontend and active browser boundary at discovery

| Area | Confirmed discovery state (before local patches) | Implication for calling work |
|---|---|---|
| Framework | EHR is Next.js `16.2.6`, React `19.2.4`, TypeScript, and the App Router. | Keep current server-rendered route and client workspace compatibility; read the installed Next.js guidance before modifying it. |
| Routes | `/communication`, `/communication/calls`, `/communication/messages`, and `/communication/email` render the local `UnifiedCommunicationHub`. | The supplied URL is a communication-hub launch, not a standalone telehealth route. A dedicated device-check/call workspace can be added later only through an approved routing decision. |
| Current call view | Calls are rendered as call events in a conversation/message-centric UI. The current-state audit classifies Calls as partial. | A call-centric, accessible view is target work; it cannot claim active media until provider evidence exists. |
| State management | The hub uses React component state and server-provided snapshots. No Redux, Zustand, or equivalent state library was found in the EHR package manifest. | Preserve explicit, testable UI state; do not put clinical authorization or call-state authority in browser state. |
| Browser HTTP | `UnifiedCommunicationHub.tsx` uses same-origin `fetch` calls with `Idempotency-Key` for commands. | Keep a stable browser contract and explicit idempotency semantics. |
| Realtime | `GET /api/communication/v1/events` is participant-filtered Server-Sent Events backed by in-process subscribers. | It is not a cross-process WebSocket/Centrifugo platform, durable stream, or media transport. Reuse only after a capability/authorization decision. |
| Authentication | Page/API access resolves a NextAuth session; an explicitly supported `asUser=dev` development/test alias resolves to seeded `dev-doctor`. Clinical roles are checked locally. | The preview alias is not production tenant, organization, patient, proxy, consent, or care-team authorization. Production authentication discovery remains required. |
| UI/design system | The route has hand-authored CSS and local components. No general component library is declared in `ehr/package.json`; design-system ownership is unverified. | Preserve the native Roshi style and WCAG/AODA constraints; do not copy a consumer-call UI. |
| Tests and commands | EHR scripts are `npm --prefix ehr run dev`, `build`, `lint`, `test:unit`, and `test:e2e`; Vitest and Playwright are declared. | Calling changes need focused unit/API/E2E/accessibility coverage plus baseline-triaged global checks. |

## Current call request trace

### Post-baseline local implementation delta

The EHR compatibility facade now exposes a list route at `GET /api/communication/v1/calls`, call detail at `GET /api/communication/v1/calls/[callId]`, and constrained call actions at `PATCH /api/communication/v1/calls/[callId]`. The local `clinicalCommunicationStore` records revisioned call state/history, waiting-room, consent, quality, and idempotency evidence in its development JSON seam. It continues to return the controlled provider-unavailable outcome rather than fabricating ringing or connected media state.

`/communication?channel=call&folder=calls` now renders `TelehealthCallWorkspace`, which presents call history and provider-unavailable status without asserting an active media session. Its linked `/telehealth/calls/[callId]/device-check` route requests microphone/camera access only after an explicit browser action, enumerates devices locally, releases check tracks, and limits an optional local camera preview to ten seconds before stopping it. It does not join, transmit, record, or create a clinical media session.

Focused store/route tests and a Playwright call-workspace/device-readiness test were added as local regression evidence. They are not evidence of provider, TURN, network, browser-permission, or production-access validation beyond the exercised local test conditions.

The following is the confirmed local source path for a **start-call command**, not a real media session:

```text
Browser: UnifiedCommunicationHub.startCall()
  -> POST /api/communication/v1/calls
  -> Next.js route handler: app/api/communication/v1/calls/route.ts
  -> getCommunicationAccess() / local actor resolution
  -> clinicalCommunicationStore.startCommunicationCall()
  -> JSON file-backed local store
  -> failed fixture record + call.failed event
  -> application/problem+json: 503 TELEPHONY_UNAVAILABLE
```

The handler accepts a conversation, optionally constrains patient context, requires an idempotency key, and enforces local participant/recipient checks. `startCommunicationCall` persists a `failed` local call with `provider: not-configured` and `errorCode: TELEPHONY_UNAVAILABLE`; it does not contact LiveKit, Redis, TURN, a gateway, or a telephone provider.

### API and route inventory at discovery

| Requested/observed path | Discovery source result (before local patches) | Target handling required |
|---|---|---|
| `GET /api/communication/v1/calls?asUser=dev` | Verified against the local development server: `405 Method Not Allowed`, consistent with the absence of a `GET` export. | Add authorized provider-independent history under a compatibility-preserving contract; document pagination, cursor, and error semantics. |
| `POST /api/communication/v1/calls` | Present; intentionally responds `503 TELEPHONY_UNAVAILABLE` after recording local evidence when no provider is configured. | Preserve callers while evolving the domain; do not convert an unavailable provider into a false ringing/connected success. |
| `/api/telehealth/v1/calls` | Not implemented. | Treat as a proposed internal/control-plane API family, not an unannounced replacement for v1 browser callers. An ADR/compatibility decision is required. |
| `GET /api/communication/v1/events` | Present as process-local SSE. | Do not treat it as durable ringing delivery or media transport. |

The post-baseline routes above are intentionally an EHR local-development facade, not a replacement `/api/telehealth/v1` control-plane deployment. Their list/detail scope, pagination and mutation behavior need a separately governed integration contract before a remote service can be connected.

## Backend and persistence discovery at discovery

| Area | Confirmed state | Unknown / required discovery |
|---|---|---|
| Calling backend | No Go `communication` or `telehealth` module exists. The active facade is a Next.js route plus TypeScript store. | Module ownership, service placement, dependency injection, migration and deployment conventions for the new control plane must be decided without creating a parallel architecture. |
| Shared Go service | `fhir/` is a custom Go module using Go `1.26.3`, Chi, `pgx/v5`, `slog`, and Goose-oriented migrations. It is not the calling control plane. | Whether a future communication service should reuse these conventions requires an approved architecture decision. |
| EHR database | Prisma declares PostgreSQL models for Patient, Practitioner, Encounter, Consent, AuditEvent, Provenance, Task, and related clinical data. | Actual deployed PostgreSQL version, PgBouncer/HA/backups, tenant model, migration ownership, and canonical appointment/organization resources were not verified. |
| Calling persistence | `clinicalCommunicationStore.ts` serializes a JSON development file in one Node process. | It has no database transaction, migration, tenant partition, distributed lock, durable outbox/inbox, multi-instance guarantee, or restore evidence. |
| Existing entities | EHR schema contains patient/practitioner/encounter/consent/audit/provenance/task concepts; calls, device registration, quality summaries, and waiting-room records are not canonical tables. | Reuse canonical IDs and owners; do not duplicate Patient data or make provider IDs business identities. |
| Infrastructure | Existing documents describe Redis/SSE and a target event backbone, but no calling LiveKit, TURN, NATS/Kafka, Centrifugo, or push provider is configured. | Inventory approved equivalent infrastructure, ownership, secrets, ports, regional topology, and support before selecting components. |

### Post-baseline Go foundation boundary

The repository now contains a separate `communication/` Go module with a calling domain/application boundary, provider interfaces that remain unavailable by default, a scoped PostgreSQL repository adapter, a Goose PostgreSQL schema migration, and `/healthz` and `/readyz` probe handlers. This is source-level foundation and migration/probe evidence only. It does not demonstrate a configured media provider, a provisioned/deployed PostgreSQL repository, an operational outbox dispatcher, production identity/authentication handlers, a LiveKit/Coturn deployment, or a running cross-process notification path.

## Authorization and privacy discovery at discovery

The local route checks an authenticated clinical session or an explicitly allowed development-preview actor, conversation participation, recipient selection, and patient-context consistency. The existing audit states that tenant, organization, care-team, proxy, patient-consent, channel, recording, jurisdiction, and cross-tenant policies are not implemented. Current local data is synthetic.

Consequently, no current path can be treated as evidence of production authorization, consent capture, caregiver/interpreter authorization, patient verification, recording policy enforcement, media token policy, or PHIPA/HIPAA compliance.

## Baseline gaps against the calling platform objective

| Capability | Current evidence | Required target result |
|---|---|---|
| Durable call history | JSON fixture data; no calls `GET` route. | PostgreSQL-backed, authorized history/read model independent of media health. |
| State machine | Local call is created directly in `failed`; no server-validated complete lifecycle/history. | Explicit legal transitions, immutable terminal states, state history, versioning, and deterministic race outcomes. |
| Media | No LiveKit/TURN/WebRTC provider configured. | Isolated provider adapter, opaque room/identity/token policy, verified webhooks, real browser media tests. |
| Ringing/push | In-process SSE only; no device registry or push provider. | Durable outbox, authorized realtime delivery, device registration, atomic multi-device acceptance, offline/push strategy. |
| Clinical workflow | Synthetic patient context only. | Governed appointment/encounter links, verification, consent, waiting room, disposition, audit, and gated FHIR projection. |
| Operations | No calling service probes, dashboards, provider monitoring, HA/DR evidence, or deployment pipeline. | Selected deployment topology, secrets, telemetry, tested failure behavior, runbooks, backup/restore, and ownership. |

## Discovery decisions and next evidence

1. Keep `/api/communication/v1` as the browser compatibility boundary while a call-history/control-plane design is introduced.
2. Treat the verified local `503 TELEPHONY_UNAVAILABLE` as intentional provider-unavailable behavior; do not generalize it to a production infrastructure failure without a separate captured trace.
3. Do not install LiveKit, add a database, add a new realtime service, or change routing before component inventory, authorization, and target-service decisions are recorded.
4. Capture a live request, status/body/headers/correlation ID, service logs, and dependency health before asserting the cause of any new `503`.
5. Obtain production IAM, tenant/organization, patient-access, appointment, audit, task, deployment, provider, network, and terminology/IG ownership decisions before a production phase is represented as verified.

---
title: 'Establish the Roshi Telehealth Calling Platform'
type: 'feature'
created: '2026-09-20'
status: 'in-review'
baseline_commit: '484507c221c960dbddd53bac6faccd14e295176d'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/communications/HLD.md'
  - '{project-root}/docs/communications/LLD.md'
  - '{project-root}/docs/communications/CURRENT_STATE_AUDIT.md'
---

<frozen-after-approval reason="user explicitly requested end-to-end implementation without an approval pause">

## Intent

**Problem:** `/communication` currently exposes a JSON-backed, provider-free call fixture: it has no call-history GET route, POST intentionally records `TELEPHONY_UNAVAILABLE`, and it cannot truthfully provide real telehealth media, durable control-plane state, or production operations.

**Approach:** Build the calling capability in the existing Roshi architecture, beginning with evidence and a compatible, durable-domain-ready EHR facade; add the Go control-plane, provider boundaries, operational artifacts, and clinical workflow only where they can be implemented and verified. Preserve the distinction between local development behavior and unproven production infrastructure.

## Boundaries & Constraints

**Always:** Ontario-first FHIR R4 context; Roshi owns clinical/control-plane truth and LiveKit owns media only; use opaque identifiers, explicit state transitions, idempotency, authorization, audit, and PHI-safe telemetry; keep `CallSession` separate from `Encounter`; retain call history when media/realtime services are unavailable; use synthetic data locally and preserve the existing v1 facade.

**Ask First:** No interactive approval pause is requested. External deployment, production credentials, real patient data, provider account creation, firewall/UDP changes, or claims of production readiness remain documented prerequisites rather than performed actions.

**Never:** Build messaging/email/SMS/SIP/PSTN/recording/transcription/AI scope; make WebSocket the media transport; put PHI in provider room IDs, URLs, metrics, logs, or notifications; replace an unavailable integration with mock success; expose raw FHIR resources to the UI; silently replace existing communication architecture.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Call history | Authorized preview actor requests existing v1 calls | Authorized, cursor-safe history is returned without contacting a media provider. | Store failure maps to `CALL_STORE_UNAVAILABLE`; unknown/foreign context is withheld. |
| Provider unavailable | Valid start/accept action with no configured media provider | Durable intent/state is retained only when the command can be safely committed; UI says calling is unavailable. | Controlled `MEDIA_PROVIDER_UNAVAILABLE`/503; never a false connected/ringing state. |
| State transition | Valid call action and current state | One legal, auditable transition and versioned event is applied idempotently. | Illegal/duplicate/race transitions return deterministic 409 codes. |
| Clinical links | Appointment, encounter, patient, caregiver/interpreter context | Opaque, authorized operational references are stored; FHIR projection remains gated by an approved Ontario/program IG. | Invalid/unauthorized references are rejected without leaking context. |
| Realtime/media outage | History/read-model remains available | Page surfaces degraded service status without fabricating delivery or media. | No loss/corruption of the durable call record. |

</frozen-after-approval>

## Code Map

- `ehr/src/lib/clinicalCommunicationStore.ts` -- current local call fixtures, persistence seam, and v1 compatibility model.
- `ehr/src/app/api/communication/v1/calls/route.ts` and `[callId]/route.ts` -- compatible local list/detail/action facade.
- `ehr/src/app/communication/UnifiedCommunicationHub.tsx` and `TelehealthCallWorkspace.tsx` -- Calls workspace and truthful degraded provider UI.
- `ehr/src/app/telehealth/calls/[callId]/device-check/` -- explicit browser-only pre-call device checks.
- `communication/` -- Go calling domain/application/persistence foundation; probe-only HTTP surface until trusted integration is wired.
- `fhir/` -- custom Go/Chi/pgx FHIR R4 service; not the calling control plane.
- `docs/communications/{HLD,LLD,CURRENT_STATE_AUDIT}.md` -- established target architecture and constraints.

## Tasks & Acceptance

**Execution:**
- [x] `docs/telehealth/calling/` -- discovery, 503 evidence, ADRs, operational/security/FHIR handoff, environment, state-contract, and implementation-report artifacts are grounded in observed repository behavior.
- [x] `ehr/src/lib/clinicalCommunicationStore.ts` and tests -- transition-validated, participant-aware development-seam call history/actions include state history, dispositions, waiting-room/consent/quality fields, idempotency, and truthful provider-unavailable behavior.
- [x] `ehr/src/app/api/communication/v1/calls/**` -- compatible local list/detail/action routes provide explicit problem details, scope boundaries, cursor pagination, and graceful provider degradation while preserving POST behavior.
- [x] `ehr/src/app/communication/**` -- Calls is a call-centric, accessible workspace with preflight, waiting/participant/state/degraded views and no claim of real media.
- [x] `communication/` and infrastructure artifacts -- repository-aligned Go domain, scoped repository adapters, migration, provider abstraction, health/readiness, outbox schema, redacted logging, and external verification gates are implemented. A compose stack is intentionally not created because no approved infrastructure selection exists.
- [x] `fhir/` integration documents/tests -- FHIR R4/terminology handoff defines approved gates without inventing an Ontario IG/profile or operational-to-FHIR state mapping.
- [x] `ehr/src/__tests__` and `ehr/tests/e2e` -- focused coverage exercises history, authorization, idempotency, outage, UI filtering/accessibility, and truthful degraded states.

**Acceptance Criteria:**
- Given an authorized actor, when they request call history, then they receive only authorized records and no LiveKit/realtime dependency is invoked.
- Given a call lifecycle action, when its state transition is legal, then exactly one auditable transition is persisted; otherwise a deterministic conflict is returned.
- Given media is not configured, when a clinician attempts a call, then the page explains the limitation without implying ringing, connection, or remote delivery.
- Given approved media infrastructure and test identities are later configured, when the eight phase gates are executed, then the reports distinguish verified behavior from outstanding prerequisites.

## Spec Change Log

- 2026-09-20: Completed the local-source implementation and moved the work to review. Production media, network, IAM, database deployment, and FHIR projection remain explicit external gates.

## Design Notes

The existing Next.js file store remains a development compatibility seam, not the production source of truth. The target Go/PostgreSQL service is introduced behind compatible browser-facing contracts; it must not make the FHIR repository, Redis, WebSocket, or a media vendor authoritative for clinical call state.

## Verification

**Commands:**
- `npm --prefix ehr run lint` -- passed.
- `npm --prefix ehr run test:unit -- --run` -- 205/206 passed; the unchanged `healthRecords.test.ts` fixture expects no allergies and eight open-work items but the repository fixture supplies Penicillin/Peanuts and seven items.
- `npx vitest run src/__tests__/clinicalCommunicationStore.test.ts src/__tests__/communicationCallsRoute.test.ts` -- 24/24 passed.
- `playwright test communication-hub.spec.ts --grep "renders authorized call history" --project=chromium` -- passed without granting media permission or asserting an active session.
- `go test ./...` and `go vet ./...` in `communication/` -- passed.

**Manual checks:**
- Visit `http://localhost:3000/communication?asUser=dev&channel=call&folder=calls`; inspect history, pre-call, provider-unavailable, keyboard/focus, narrow viewport, and no-claim states.

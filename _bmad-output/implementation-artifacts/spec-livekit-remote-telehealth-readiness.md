---
title: 'Harden LiveKit Telehealth for Remote-Readiness'
type: 'feature'
created: '2026-10-04'
status: 'implemented-with-external-release-blockers'
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/telehealth/calling/fhir-terminology-handoff.md'
---

<frozen-after-approval reason="user explicitly requested end-to-end implementation without an approval pause">

## Intent

**Problem:** The supplied Calls URL is a clinician-to-lab conversation, yet the local LiveKit meeting surface can present hard-coded patient/visit details and issue media joins without a verifiable patient-visit eligibility decision. The local stack is not deployable remotely: LiveKit is loopback-only, the control plane is not database-ready, and no approved target, identity source, TLS/TURN, or patient portal is configured.

**Approach:** Turn the existing local LiveKit proof into a safe remote-readiness foundation: enforce a server-derived telehealth context before any meeting UI or grant, make the meeting surface truthful and connection-aware, strengthen production-only controls, and add non-secret deployment artifacts and verification gates. Keep actual production release disabled until external identity, policy, infrastructure, and two-device evidence exist.

## Boundaries & Constraints

**Always:** Ontario-first FHIR R4 assumptions; CallSession remains operational and distinct from Encounter; Patient, Appointment, and Encounter links stay opaque and authorized; LiveKit gets only opaque room/participant identifiers; tokens and provider secrets remain server-side and short-lived; recording stays off; a call is not connected until LiveKit reports an actual connection and remote media is observed; existing user changes are preserved.

**Ask First:** External deployment, DNS/TLS issuance, firewall or public UDP changes, cloud/provider accounts, production secrets, real patient/portal identities, data migration, or clinical-policy approval. These are prerequisites to document and verify, not operations to simulate.

**Never:** Turn the supplied lab conversation into a patient visit; infer portal eligibility from contact details or a directory capability; put PHI in LiveKit IDs, URLs, logs, or manifests; send a browser a signing secret; expose a synthetic participant outside an explicit local-development gate; mark local loopback or two-tab behavior as remote production readiness.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Missing clinical context | Call lacks patient and approved visit context | Meeting UI and join route withhold media access. | Explain that a verified patient/visit eligibility decision is required; no token is minted. |
| Eligible future visit | Server provides an authorized patient/visit view model and allowed participant | UI displays only that data; short-lived room-scoped grant is requested on explicit join. | Provider/token failures are actionable and never become connected state. |
| Production endpoint | Live provider config uses loopback/private literal host | Startup rejects the unsafe configuration. | Fail fast with a non-secret configuration error. |
| Local/dev proof | Development badge and explicit local-demo configuration | Synthetic helpers remain visibly non-production and are never rendered in production. | No claim of patient delivery, TURN, or remote verification. |

</frozen-after-approval>

## Code Map

- `ehr/src/app/communication/TelehealthCallWorkspace.tsx` -- authorized call history and meeting affordance.
- `ehr/src/app/telehealth/calls/[callId]/meeting/` -- LiveKit browser experience that must stop using synthetic clinical content.
- `ehr/src/app/api/communication/v1/calls/[callId]/` -- server-side call detail, eligibility, join, and end boundaries.
- `ehr/src/lib/clinicalCommunicationStore.ts` and `communicationProviders.ts` -- local facade and Go control-plane bridge.
- `communication/internal/{config,handler,media}/` -- production provider validation and scoped join issuance.
- `ehr/.dockerignore`, `ehr/Dockerfile`, `communication/Dockerfile`, `docs/telehealth/calling/` -- deployment safety and operational handoff.

## Tasks & Acceptance

**Execution:**
- [x] Add one server-derived telehealth context/eligibility seam; use it to block the lab conversation and any call without an approved patient-visit relationship.
- [x] Replace static meeting identity/visit copy with authorized context, hide local-demo affordances outside development, fix the meeting visual selector drift, preserve device preferences, and end through the control plane when available.
- [x] Tighten Go LiveKit production endpoint validation and join eligibility; cover failures with focused tests.
- [x] Add secret-safe Docker build exclusions and deployment-ready documentation/templates without committing credentials or claiming an external release.
- [x] Add focused EHR/Go tests and re-run targeted checks; record baseline whole-repo failures separately.

**Acceptance Criteria:**
- Given the supplied clinician-to-lab call, when a meeting route is requested, then it cannot display a patient visit or issue a LiveKit token.
- Given a future, explicitly authorized patient visit, when the caller opens the meeting route, then only server-derived context is rendered and no media is asserted before the provider connects.
- Given production configuration, when a loopback LiveKit endpoint is supplied, then the service refuses to start.
- Given a Docker build context, when an image is built, then `.env` and local build artifacts cannot be copied into it.

## Verification

**Commands:**
- `npm --prefix ehr run lint` -- baseline is currently blocked by generated `.build` files and existing repository lint violations; lint changed paths directly.
- `npm --prefix ehr run test:unit -- --run` -- baseline has the unrelated Health Records fixture mismatch; run focused call tests.
- `go test ./...` and `go vet ./...` in `communication/` -- expected: focused control-plane tests pass.

**Observed:** Focused EHR tests pass (36 tests); focused telehealth lint passes; Go tests and vet pass. The exact supplied URL returns `200`, filters to its one call record, and its meeting-context/join boundary denies media with `TELEHEALTH_PATIENT_CONTEXT_REQUIRED` and no token. The broader EHR suite retains one unrelated Health Records fixture mismatch; repository-wide lint reports pre-existing generated `.build` and source violations. A full project TypeScript check likewise has unrelated existing Next.js route and source errors.

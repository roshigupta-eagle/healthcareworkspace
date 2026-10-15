# Roshi Unified Clinical Communication Platform - Product Requirements Document

**Status:** Revised implementation-aligned contract
**Revision date:** 2026-09-14
**Jurisdiction:** Ontario, Canada is the intended deployment context. The applicable Ontario Health program, trading-partner contract, implementation guide (IG), terminology server, and profile package remain to be selected before production interoperability is enabled.
**Canonical source:** This Markdown document, [HLD.md](HLD.md), [LLD.md](LLD.md), and [CURRENT_STATE_AUDIT.md](CURRENT_STATE_AUDIT.md). The adjacent DOCX is a historical export and must be regenerated before it is used as a current specification.

## 1. Product decision

Roshi needs one clinical communication experience for clinician, patient, and care-team work without representing local development fixtures as delivered clinical communications.

The current product is an EHR-hosted, local-development Communication Hub. Its browser-facing contract is implemented in the Next.js EHR application, with local JSON-backed state and in-process freshness events. It is useful for demonstrating and validating workflow behavior, but it is not a production communication service.

The approved evolution is incremental:

1. Preserve the EHR Communication Hub and `/api/communication/v1` contract as the browser boundary.
2. Extract canonical communication state, idempotency, and transactional outbox behavior into a Go/PostgreSQL communication service that fits the existing Go service workspace.
3. Add governed clinical integrations, approved providers, and production deployment only after the prerequisite policy and operational gates are met.

No feature may claim external delivery, real-time media, FHIR conformance, PHIPA compliance, or production availability until its corresponding implementation and approval gates are satisfied.

## 2. Problem and outcome

Clinicians need to review and act on patient-linked messages, delivery issues, calls, voicemails, and follow-up work in one place. Fragmented channels hide urgency and make it difficult to preserve the clinical context and an accurate audit trail.

The desired outcome is a longitudinal communication workspace where users can safely understand what is local, queued, delivered, unavailable, or requiring action; link a conversation to the correct patient and clinical context; and follow through using the system of record selected for each capability.

## 3. Users

| User | Primary need | Current local capability |
|---|---|---|
| Clinician or nurse | Review, reply, acknowledge, and create follow-up work in patient context. | Available for the seeded development actor and authenticated clinical roles. |
| Care-team member | See permitted shared conversations and act on assigned work. | Participant-scoped local view only. |
| Patient or proxy | Receive and initiate permitted patient-visible communications. | Represented in synthetic fixtures; no production portal delivery contract exists. |
| Pharmacy or laboratory user | Exchange clarification and result-related communication. | Represented in synthetic fixtures; no external endpoint delivery is configured. |
| Operations or security administrator | Investigate availability, access, and exception states. | Limited fixture/status display; no production operations service exists. |

## 4. Goals and non-goals

### Goals

- Provide one EHR communication workspace with consistent folder, channel, conversation, and patient-context behavior.
- Make local acceptance, queued work, provider unavailability, attachment limitations, and delivery evidence explicit.
- Preserve a stable browser contract while the durable backend is introduced.
- Support a future Ontario-aligned FHIR R4 projection without using FHIR as the delivery broker.
- Establish traceable, testable release gates for privacy, security, reliability, interoperability, providers, and operations.

### Non-goals for the current local release

- Sending real email, SMS, PSTN, SIP, WebRTC, push notification, or LiveKit media traffic.
- Claiming durable, multi-instance, or restart-safe communication processing.
- Recording or transcribing clinical calls.
- Replacing the existing task, audit, scheduling, FHIR, identity, or clinical record systems.
- Automatically diagnosing, triaging, prescribing, ordering, creating a signed clinical note, or completing a task.

## 5. Current implementation contract

| Capability | Implemented local behavior | Explicit limit |
|---|---|---|
| Hub and views | EHR routes render conversations, drafts, messages, calls, voicemails, timeline records, folders, and channel filters. | Channel-focused views remain an EHR local seam, not a shared host product. |
| Browser API | Next.js routes under `/api/communication/v1` return a standard data envelope or `application/problem+json`, with correlation and idempotency handling. | The BFF and domain logic run inside the EHR process; there is no standalone BFF or Go communication service. |
| State | `clinicalCommunicationStore` serializes development data to `ehr/data/communication_hub.json`. | This is not a transactional, tenant-isolated, shared production database or a durable workflow ledger. |
| Access | Normal session checks and an explicit non-production `asUser=dev` preview resolve a local clinician. Conversation reads and mutations are participant-scoped. | Tenant, organization, circle-of-care, proxy, consent, recording, and cross-organization policy are not implemented. |
| Messages and drafts | Local messages, replies, internal notes, drafts, acknowledgement records, local task records, and idempotent retries are supported. | Local acceptance and queued state are not evidence of external delivery; tasks are not yet the canonical task service. |
| Attachments | Server-issued, actor- and patient-bound, single-use attachment metadata is validated before message submission. | There is no binary upload, hash verification, malware scan, DLP, object storage, or durable scan lifecycle. |
| Calls and voicemail | Fixture call and voicemail records can be displayed; a call attempt reports provider unavailability. | No telephony, LiveKit, TURN, recording, transcription, or provider webhook is configured. |
| Freshness | The EHR exposes participant-filtered server-sent events (SSE) in the running process. | No cross-process event bus, replay cursor, or durable event stream exists. |
| MFE | `communication-mfe` exposes Module Federation entries and can build remote assets. | The EHR does not consume the remote; it is not yet a deployed shared microfrontend. |
| FHIR and audit | The separate Go FHIR R4 service advertises generic `Communication` CRUD; legacy EHR audit utilities exist. | No communication mapper, profile validation, canonical task integration, or complete audit integration is wired. |

## 6. Functional requirements

| ID | Requirement | Release boundary |
|---|---|---|
| COM-PRD-01 | A clinician can open the Communication Hub with deterministic folder, channel, selected-conversation, and patient launch state. A filtered-out conversation cannot remain selected. | Current local release |
| COM-PRD-02 | A permitted participant can create a local message, reply, save a draft, add an internal note, acknowledge an addressed message, and create local follow-up work. Replay-prone commands require an idempotency key. | Current local release |
| COM-PRD-03 | The UI and API distinguish local acceptance, queued delivery, endpoint unavailability, provider absence, and actual recipient evidence. | Current local release and all future releases |
| COM-PRD-04 | A server-issued attachment reference is bound to actor, patient, expiry, and one message submission; forged, foreign, expired, reused, or patient-mismatched references are rejected. | Current local release |
| COM-PRD-05 | Browser-facing v1 contracts remain versioned and backward-compatible while the implementation moves from EHR-local storage to a service boundary. | Transition foundation |
| COM-PRD-06 | Canonical conversations, messages, participants, recipient state, idempotency records, attachments, calls, voicemails, and delivery records are stored in a transactional PostgreSQL system of record. | Production foundation |
| COM-PRD-07 | An accepted production message writes a transactional outbox record. Delivery side effects are replayable, idempotent, per recipient, and truthfully represented in a durable ledger. | Reliability foundation |
| COM-PRD-08 | Authorization evaluates authenticated actor, tenant, organization, patient, conversation, recipient, source-resource, attachment, action, proxy, consent, jurisdiction, and channel policy before each protected operation. | Governance foundation |
| COM-PRD-09 | Communication-created work is created in the canonical task service and is linked to the exact communication or clinical resource that is its focus. Meaningful actions are written to the approved audit service. | Clinical integration |
| COM-PRD-10 | Clinical-record projection to FHIR R4 uses a versioned, server-side mapper. `Communication` represents retained clinical communication content, never operational delivery state. | FHIR integration |
| COM-PRD-11 | Exchanged coded fields use an approved Ontario/program profile, terminology package, terminology server, value-set binding, version, and display-language policy. Internal operational states remain local and configurable. | FHIR and terminology gate |
| COM-PRD-12 | Email, secure external messaging, media, telephony, voicemail, notification, and attachment-scanning adapters are enabled only after provider, policy, secrets, webhook, retention, and operational controls are approved. | Provider onboarding |
| COM-PRD-13 | Production services expose health, readiness, tracing, metrics, safe diagnostics, backup/restore, rollout, rollback, and incident-recovery evidence. | Production release |

## 7. Clinical, privacy, and safety rules

- A patient-linked conversation has one patient scope. A source, recipient, or attachment from another patient scope is rejected.
- Submitted message content is immutable. A correction or replacement creates a linked record; it does not silently rewrite the original.
- Conversation state, message state, delivery state, read state, acknowledgement state, and task/action state are independent facts.
- No weaker technical signal is shown as stronger clinical evidence. For example, provider acceptance is not a human read or acknowledgement.
- FHIR `Communication.status` is not a proxy for queued, retrying, delivered, read, acknowledgement, call, voicemail, or endpoint-health state.
- `Consent` is a clinical directive input, not a substitute for authorization. Ontario PHIPA and organization policy decisions remain required before production enablement.
- AI output is optional, source-linked, labeled for review, and cannot autonomously perform clinical actions. The current rules-based local summary is not a configured AI service.
- Logs, metrics, events, and provider notifications contain the minimum necessary information and never require message bodies, audio, transcripts, access tokens, or unnecessary patient identifiers.

## 8. FHIR and terminology boundary

The repository currently operates a custom Go FHIR R4 service, not a HAPI JPA server. It supports generic CRUD/search/history and advertises `Communication`, but it does not currently validate or project Communication-domain records, preserve the required profile metadata behavior, or provide the full resource/search/message-Bundle surface required for partner exchange.

Before enabling FHIR exchange, the delivery team must select and record:

- Ontario Health program or trading-partner IG, package version, CapabilityStatement, profile canonicals, identifier rules, and transport/security contract.
- The authoritative terminology server, terminology package versions, `Communication` status/priority/category bindings, local-code governance, ConceptMap handling, and EN/FR display requirements where applicable.
- The exact FHIR mapping, validation fixtures, negative conformance tests, and production ownership for `Communication`, `CommunicationRequest`, `Task`, `DocumentReference`, `Binary`, `AuditEvent`, `Provenance`, and any `Bundle`/`MessageHeader` exchange.

The FHIR mapping in [HLD.md](HLD.md) and [LLD.md](LLD.md) is therefore a planned projection contract, not a current integration claim.

## 9. Release plan and gates

| Release | Outcome | Required gate |
|---|---|---|
| L0 - Local hub | Truthful, participant-scoped EHR workflow with synthetic development data. | Focused EHR unit, API, and E2E tests pass; no provider or production claim is exposed. |
| L1 - Durable core | PostgreSQL-backed canonical communication state behind the stable v1 facade. | Migration, restart, concurrency, idempotency, authorization, backup/restore, and compatibility tests pass. |
| L2 - Reliable delivery | Durable outbox/inbox, event backbone, replay, and per-recipient delivery ledger. | Rollback, duplicate, timeout, retry, dead-letter, recovery, and multi-instance tests pass. |
| L3 - Clinical governance | Canonical task/audit integration and approved policy enforcement. | Privacy, access, audit-completeness, and clinical-owner sign-off pass. |
| L4 - Interoperability | Validated FHIR projection and terminology governance for a named Ontario/program contract. | Alex FHIR review, Morgan terminology handoff, profile/terminology validation, and partner conformance evidence pass. |
| L5 - Providers and operations | Approved channel adapters, MFE adoption where justified, and production deployment. | Provider certification, secrets/webhooks, security, observability, resilience, rollout/rollback, and release approval pass. |

## 10. Success measures

Current success is measured by truthful local behavior: no forged attachment use, no duplicate local submission after a retry, no stale filtered selection, correct participant containment, and an explicit unavailable state for unconfigured providers.

Production SLOs, retention periods, acknowledgement deadlines, retry schedules, and clinical escalation policies are intentionally not set in this PRD. They require accountable clinical, privacy, operations, and partner approval and must be recorded with the selected tenant and channel policy.

## 11. Traceability

- Current implementation evidence: [CURRENT_STATE_AUDIT.md](CURRENT_STATE_AUDIT.md).
- Architecture and transition boundaries: [HLD.md](HLD.md) and [LLD.md](LLD.md).
- Delivery backlog: [05_Roshi_Communication_Epics_Features_User_Stories.md](05_Roshi_Communication_Epics_Features_User_Stories.md).
- Diagram sources: [diagrams](diagrams). Existing diagrams describe the target architecture unless the diagram explicitly says `Current local implementation`.

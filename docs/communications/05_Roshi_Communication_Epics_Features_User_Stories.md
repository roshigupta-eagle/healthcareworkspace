# Roshi Communication Platform - Epics, Features, and User Stories

**Status:** Implementation-aligned delivery backlog
**Revision date:** 2026-09-14
**Source requirements:** [01_Roshi_Communication_PRD.md](01_Roshi_Communication_PRD.md), [HLD.md](HLD.md), [LLD.md](LLD.md), and [CURRENT_STATE_AUDIT.md](CURRENT_STATE_AUDIT.md)
**Planning rule:** A story may not convert a local fixture, local acceptance, or unavailable-provider state into a production claim. Production stories close only with their stated technical and governance evidence.

## Delivery sequence

| Sequence | Epic | Outcome |
|---|---|---|
| L0 | COM-01 | Keep the current EHR-local hub safe, deterministic, and truthful while it remains a development seam. |
| L1 | COM-02 | Establish a durable Go/PostgreSQL communication system of record behind the stable EHR v1 facade. |
| L2 | COM-03 | Add reliable delivery, policy, canonical task/audit integration, and governed attachment processing. |
| L3 | COM-04 | Harden FHIR R4 capabilities and introduce an approved Ontario/program projection and terminology contract. |
| L4 | COM-05 | Onboard approved providers, optional MFE consumption, deployment, operations, and production release controls. |

## Epic COM-01: Trustworthy Local Communication Hub

**Outcome:** The current EHR-hosted Communication Hub remains a useful, testable local workflow without implying production persistence, external delivery, or clinical interoperability.

**PRD traceability:** COM-PRD-01 through COM-PRD-04.

### Feature COM-F01: Deterministic local communication workflow

#### Story COM-101: Reconcile launch, folder, channel, and selected conversation state

**User story:** As a clinician, I want the displayed conversation to always belong to the selected folder, channel, and patient context so that I do not act on a thread hidden by my current filter.

**Acceptance criteria:**

- Given a mode, folder, or patient filter removes the selected conversation, when the result set refreshes, then the UI selects an eligible conversation or shows the correct empty state.
- Given a supported launch URL, when the hub opens or browser history changes, then folder, channel, patient, and selected-conversation state are applied consistently.
- Given an unavailable view such as unconfigured email, when no eligible conversation exists, then the detail area does not retain content from another channel.

**Status/dependencies:** Existing local capability; retain as an E2E regression gate. Maps to COM-PRD-01.

#### Story COM-102: Preserve safe local message, draft, and retry behavior

**User story:** As a clinician, I want a local draft or message retry to preserve its intended conversation, recipient, and idempotency key so that an ambiguous response cannot create a duplicate communication.

**Acceptance criteria:**

- Given a reply, internal note, or draft save, when the command is submitted, then the server validates the conversation and recipient rules before local state changes.
- Given a retry after an ambiguous response, when the same idempotency key and payload are replayed, then the original local result is returned and no duplicate message is created.
- Given a multi-party conversation, when a reply has no unambiguous recipient, then the command is rejected until an authorized recipient is selected.

**Status/dependencies:** Existing local capability; retain unit and E2E coverage. Maps to COM-PRD-02 and COM-PRD-03.

### Feature COM-F02: Truthful local boundaries

#### Story COM-103: Surface provider and channel truthfully

**User story:** As a clinician, I want to understand whether an action is locally recorded, queued, unavailable, or externally evidenced so that I do not mistake development behavior for patient communication.

**Acceptance criteria:**

- Given an unconfigured provider, when a user attempts email, calling, media, or external delivery, then the UI and API show an explicit unavailable/deferred state and a safe alternate action.
- Given a local message is accepted, when its delivery record is displayed, then it is not labelled delivered, read, or acknowledged without the corresponding authorized evidence.
- Given a fixture call or voicemail, when it is displayed, then it does not imply a live provider session, recording, or transcription service.

**Status/dependencies:** Existing local capability; retain visual and E2E coverage. Maps to COM-PRD-03.

#### Story COM-104: Enforce attachment-reference containment in local mode

**User story:** As a clinician, I want attachment references validated against me, the selected patient, expiry, and single use so that local testing cannot attach an unauthorized or stale reference.

**Acceptance criteria:**

- Given an attachment reference is issued, when it is submitted, then the server verifies actor, patient, expiry, uniqueness, and one-time use before writing the message.
- Given a forged, foreign, expired, reused, duplicated, or patient-mismatched ID, when it is submitted, then the command returns a specific problem detail and no message is written.
- Given a valid reference, when it is shown in the UI, then its state is clearly metadata-only rather than uploaded/scanned binary content.

**Status/dependencies:** Existing local capability; retain API and E2E coverage. Maps to COM-PRD-04.

## Epic COM-02: Durable Communication Core

**Outcome:** Communication workflow truth moves from the file-backed EHR seam to a Go/PostgreSQL service without breaking the browser-facing v1 contract.

**PRD traceability:** COM-PRD-05 through COM-PRD-07.

### Feature COM-F03: Canonical PostgreSQL communication service

#### Story COM-201: Establish the Go communication module and migration baseline

**User story:** As a platform engineer, I want a Go communication module with explicit ownership and reversible migrations so that conversations and messages have a durable system of record.

**Acceptance criteria:**

- Given the new `communication` module is introduced, when its migration command runs against an empty database, then it creates the approved conversation, participant, message, recipient, delivery, attachment, call, voicemail, idempotency, inbox, and outbox structures.
- Given a migration fails or rolls back, when the service starts, then it does not accept commands against a partial schema.
- Given service configuration, when the process starts, then database credentials, tenancy configuration, encryption/key-management references, and health readiness are externalized rather than embedded in source.

**Dependencies:** Database ownership decision, migration tool choice, tenancy model, and security review. Maps to COM-PRD-05 and COM-PRD-06.

#### Story COM-202: Implement canonical command/query behavior behind the existing facade

**User story:** As an EHR user, I want the Communication Hub to retain compatible v1 behavior while its data moves to the service so that the migration does not interrupt clinical workflow.

**Acceptance criteria:**

- Given an existing browser v1 request, when the EHR facade delegates to the Go service, then compatible success envelopes, correlation IDs, idempotency behavior, and problem details are returned.
- Given an authorized query, when it reads a conversation, then the service enforces tenant, organization, patient, participant, and source-context scope before returning data.
- Given a new write, when the transaction commits, then the canonical record contains immutable submitted content and distinct conversation, message, recipient, delivery, acknowledgement, and action facts.

**Dependencies:** COM-201, versioned internal contract, authorization model. Maps to COM-PRD-05 and COM-PRD-06.

#### Story COM-203: Implement durable idempotency and concurrency control

**User story:** As a clinician, I want retries to return a deterministic result without duplicates or lost updates so that unreliable networks do not create unsafe communication records.

**Acceptance criteria:**

- Given the same actor, operation, idempotency key, and request hash, when the command is replayed, then the original response is returned without a second side effect.
- Given the same idempotency key with different content, when the command is received, then it returns `IDEMPOTENCY_CONFLICT` and preserves the original record.
- Given concurrent mutations of a draft or conversation, when one version is stale, then the caller receives a concurrency conflict and no changes are silently lost.

**Dependencies:** COM-201 and COM-202. Maps to COM-PRD-06 and COM-PRD-07.

### Feature COM-F04: Durable event and freshness foundation

#### Story COM-204: Write and publish a transactional outbox

**User story:** As a delivery worker, I want every accepted communication command to create an atomic outbox event so that downstream processing can be replayed after failures.

**Acceptance criteria:**

- Given a canonical write is committed, when the transaction completes, then its versioned outbox event is committed in the same transaction.
- Given the database transaction rolls back, when the command fails, then no message, delivery, or outbox event is visible.
- Given a worker restarts or receives a duplicate event, when it resumes processing, then publish and receiver behavior is idempotent and auditable.

**Dependencies:** COM-201, COM-203, event-backbone decision. Maps to COM-PRD-07.

#### Story COM-205: Replace in-process freshness with durable replay-aware updates

**User story:** As a clinician using multiple sessions, I want the Hub to refresh after a permitted communication change so that I see current state after a reconnect or another user action.

**Acceptance criteria:**

- Given an authorized communication change, when its event is published, then the user receives a freshness notification containing opaque IDs and no unnecessary PHI.
- Given an SSE/websocket reconnect, when a replay cursor is valid, then the client can recover missed change notifications or safely re-query current state.
- Given multiple application instances, when one instance writes data, then permitted users connected to another instance can receive a corresponding freshness signal.

**Dependencies:** COM-204, approved realtime/event-backbone design. Maps to COM-PRD-07.

## Epic COM-03: Governed Clinical Workflow and Delivery

**Outcome:** Production communication commands are governed by policy, use canonical tasks/audit records, and retain delivery/attachment evidence that accurately reflects what happened.

**PRD traceability:** COM-PRD-07 through COM-PRD-09 and COM-PRD-12.

### Feature COM-F05: Production authorization, task, and audit integration

#### Story COM-301: Enforce policy at the service boundary

**User story:** As a privacy and security owner, I want every protected communication operation evaluated against the correct actor, patient, organization, and consent context so that local preview rules cannot become production authorization.

**Acceptance criteria:**

- Given any read, write, download, manual confirmation, or provider action, when the service receives it, then authenticated actor, tenant, organization, patient, conversation, recipient, source-resource, attachment, channel, proxy, consent, and jurisdiction checks are evaluated server-side.
- Given a denied request, when it is processed, then it returns a safe problem response and writes the required audit evidence without disclosing restricted information.
- Given production configuration, when a request includes `asUser=dev` or another preview bypass, then it is rejected and cannot resolve an authenticated actor.

**Dependencies:** COM-202, clinical/privacy policy decisions, identity integration. Maps to COM-PRD-08.

#### Story COM-302: Create canonical tasks and immutable audit records

**User story:** As a clinician, I want follow-up work and meaningful communication actions recorded in the appropriate shared systems so that the Hub does not create isolated, invisible clinical work.

**Acceptance criteria:**

- Given a user creates a task from a message, when the command succeeds, then the canonical task service owns the task lifecycle and stores a precise focus link to the communication or applicable clinical resource.
- Given a communication action occurs, when it is meaningful for audit, then the approved audit service records actor, action, target, outcome, correlation ID, and policy-relevant evidence.
- Given the task or audit dependency is unavailable, when the command cannot safely complete, then the system reports a truthful failure or pending state and does not claim synchronization.

**Dependencies:** COM-201, COM-202, COM-301, task/audit contract decisions. Maps to COM-PRD-09.

### Feature COM-F06: Governed delivery and attachment lifecycle

#### Story COM-303: Build per-recipient delivery ledger and recovery workflow

**User story:** As an operations user, I want each recipient/channel attempt represented independently so that retries, fallback, recovery, and manual confirmation do not hide the actual delivery history.

**Acceptance criteria:**

- Given a message has multiple recipients or fallback channels, when delivery is planned, then each delivery has an independent durable state, attempt history, correlation ID, and evidence source.
- Given a transient endpoint failure, when retry policy applies, then the original delivery remains pending, the retry is scheduled, and a permitted fallback does not overwrite primary history.
- Given recovery or a duplicate provider callback, when processing occurs, then the receiver-inbox ledger deduplicates it and appends rather than rewrites delivery facts.

**Dependencies:** COM-204, COM-301, approved routing/retry/fallback policies. Maps to COM-PRD-07 and COM-PRD-12.

#### Story COM-304: Introduce controlled binary attachment processing

**User story:** As a clinician, I want to attach approved clinical content safely so that messages cannot distribute unscanned, mis-scoped, or expired files.

**Acceptance criteria:**

- Given an upload begins, when binary content is received, then MIME/signature, size, checksum, actor, patient, source-resource, retention, and storage policy are validated.
- Given scanning or DLP fails, when a user tries to submit the attachment, then delivery is blocked with a truthful state and the binary is handled according to approved retention/quarantine policy.
- Given content is safe, when it is attached to a message, then immutable metadata and exact source links are retained without exposing storage credentials to the browser.

**Dependencies:** COM-201, COM-301, approved storage/scanner/DLP/retention design. Maps to COM-PRD-04 and COM-PRD-12.

## Epic COM-04: Ontario-Ready FHIR and Terminology Integration

**Outcome:** Clinical communication projections use valid FHIR R4 and governed terminology only after the existing FHIR platform, Ontario/program contract, and validator behavior are demonstrably ready.

**PRD traceability:** COM-PRD-10 and COM-PRD-11.

### Feature COM-F07: Harden the FHIR R4 integration platform

#### Story COM-401: Establish the FHIR communication conformance baseline

**User story:** As a FHIR implementation owner, I want the shared FHIR service to retain profile metadata and support the selected required resources and searches so that a Communication projection is validated rather than merely stored as JSON.

**Acceptance criteria:**

- Given a resource contains approved `meta.profile` and security labels, when it is stored and read back, then the required metadata is retained and validated according to the selected contract.
- Given the selected communication integration scope, when CapabilityStatement and search tests run, then required resources, searches, version behavior, Bundle behavior, and `OperationOutcome` failures are explicitly supported or excluded.
- Given invalid `Communication` content, references, status, profile, or terminology, when it is submitted, then validation rejects it with an appropriate FHIR response.

**Dependencies:** Ontario/program or partner contract, FHIR-service hardening decision, Alex approval. Maps to COM-PRD-10.

#### Story COM-402: Implement a policy-controlled Communication projection adapter

**User story:** As a clinician, I want eligible clinical communication content projected to the FHIR record with correct links so that it is interoperable without turning FHIR into a delivery queue.

**Acceptance criteria:**

- Given policy approves a retained clinical message, when projection runs, then it creates/updates a valid FHIR R4 `Communication` using subject, topic, payload, sender/recipient, context, and reply relationships correctly.
- Given a requested future outreach, when it is clinically represented, then `CommunicationRequest` is used only for that request and the fulfilled record links through `basedOn`.
- Given delivery, read, acknowledgement, call, or voicemail operational state changes, when they occur, then they remain in the communication delivery/operational model and do not alter `Communication.status` incorrectly.

**Dependencies:** COM-201, COM-302, COM-401, projection policy, Alex approval. Maps to COM-PRD-10.

### Feature COM-F08: Govern terminology and partner interoperability

#### Story COM-403: Record terminology and IG governance before exchange

**User story:** As an interoperability lead, I want the Ontario/program terminology and IG decisions recorded and testable so that local literals are not silently emitted as clinical terminology.

**Acceptance criteria:**

- Given a field is exchanged as coded clinical data, when its mapping is approved, then its CodeSystem/ValueSet, version, binding strength, display-language policy, mapping owner, and validation path are documented.
- Given a partner payload is built, when codes are validated, then `$lookup`, `$validate-code`, `$expand`, and `$translate` behavior is tested against the selected terminology source as applicable.
- Given internal operational fields such as delivery, endpoint, retry, call, scan, or provider state, when mappings are reviewed, then they remain local/configurable unless an explicit approved mapping exists.

**Dependencies:** Ontario/program or partner contract, terminology server access, Morgan terminology handoff, Alex approval. Maps to COM-PRD-11.

#### Story COM-404: Validate FHIR projection and partner exchange fixtures

**User story:** As a delivery team, I want positive and negative exchange fixtures validated against the selected profile set so that production interoperability failures are found before a patient communication is exchanged.

**Acceptance criteria:**

- Given approved fixtures, when base R4 and selected IG/profile validation run, then valid messages, requested communications, task links, document links, provenance, and audit cases pass.
- Given invalid fixtures, when validation runs, then wrong patient references, unsupported recipient types, invalid status, profile loss, terminology mismatch, wrong edition/version, and malformed message Bundles fail predictably.
- Given a FHIR message Bundle is required by a partner, when it is emitted, then it has the partner-approved semantics and begins with `MessageHeader`; otherwise a REST or document pattern is used deliberately.

**Dependencies:** COM-401 through COM-403 and partner test environment. Maps to COM-PRD-10 and COM-PRD-11.

## Epic COM-05: Provider Enablement and Production Operations

**Outcome:** Roshi can enable approved channels and deploy the communication architecture safely, with delivery evidence, operational recovery, and a proven user experience.

**PRD traceability:** COM-PRD-12 and COM-PRD-13.

### Feature COM-F09: Approved provider adapters

#### Story COM-501: Onboard one secure delivery provider end to end

**User story:** As a clinician, I want an approved secure delivery channel to report its real delivery evidence so that I can safely communicate outside the local hub.

**Acceptance criteria:**

- Given a provider is approved and configured, when a message is routed, then credentials are held server-side, recipient/consent/channel policy is evaluated, and an idempotent provider request is recorded in the delivery ledger.
- Given a provider webhook or poll result arrives, when it is verified, then the correct delivery attempt is appended with its actual evidence and duplicate callbacks are harmless.
- Given the provider is unavailable, when a command is submitted, then retry, fallback, and exception-queue behavior follows approved policy without overclaiming delivery.

**Dependencies:** COM-303, COM-304 where attachments are supported, COM-301, provider security/privacy/retention approval. Maps to COM-PRD-12.

#### Story COM-502: Enable media or telephony only behind a governed adapter

**User story:** As a clinician, I want to start or receive an approved call/media session from a patient context so that the session has correct authorization, consent, and operational evidence.

**Acceptance criteria:**

- Given a provider is approved, when a call is initiated, then the service creates a canonical call record, checks participant/call policy, and issues only short-lived scoped media credentials.
- Given provider events occur, when they are verified, then call state, participants, reconnect/failure evidence, and dispositions are appended to the operational record.
- Given recording or transcription is requested, when policy or consent is missing, then the provider action is blocked and the UI explains the truthful state.

**Dependencies:** COM-301, COM-303, provider selection, consent/retention policy, security review. Maps to COM-PRD-12.

### Feature COM-F10: Host integration and operational release

#### Story COM-503: Prove and adopt the communication MFE only where it adds value

**User story:** As an EHR host team, I want a versioned and recoverable MFE integration so that the shared Communication Hub can be reused without making the EHR unavailable when a remote fails.

**Acceptance criteria:**

- Given the remote is loaded by the EHR, when host and remote versions are compatible, then the host passes the versioned contract, launch context, capabilities, navigation callback, and typed events successfully.
- Given the remote is unavailable or incompatible, when the route opens, then the EHR presents a tested local fallback without losing accepted communication processing.
- Given the remote is released, when build, type, lint, unit, accessibility, manifest, and end-to-end host tests run, then all gates pass before the host points to it.

**Dependencies:** COM-202 and MFE type/lint/test remediation. Maps to COM-PRD-05 and COM-PRD-13.

#### Story COM-504: Deliver deployable services, observability, and recovery evidence

**User story:** As an operations owner, I want the communication services deployed with safe observability and recovery controls so that failures can be detected, investigated, and recovered without losing accepted work.

**Acceptance criteria:**

- Given a deployment is prepared, when CI runs, then service build, migration, contract, unit/integration, security, and container checks are required before promotion.
- Given an API, worker, provider, or database failure, when health/readiness/liveness and dashboards are evaluated, then the system exposes opaque IDs and minimum-necessary diagnostics with actionable alerts/runbooks.
- Given a restore, rollback, or regional/provider incident exercise, when recovery completes, then accepted messages, outbox events, pending deliveries, and immutable audit evidence reconcile according to approved RPO/RTO policy.

**Dependencies:** COM-201 through COM-303, provider plan, deployment/operations ownership, approved RPO/RTO. Maps to COM-PRD-13.

## Cross-cutting definition of done

A story is complete only when its acceptance criteria have automated coverage at the appropriate layer, accessible user behavior where it has a UI effect, safe error behavior, updated architecture/contract documentation, and named operational ownership. Stories that affect FHIR mappings, profiles, terminology, clinical codes, or exchange payloads additionally require Morgan's terminology handoff and Alex's FHIR approval. Stories that enable an external channel additionally require privacy, security, provider, retention, audit, and release approval.
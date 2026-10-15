# Roshi Unified Clinical Communication Platform - Low-Level Design

**Status:** Revised implementation-aligned design
**Revision date:** 2026-09-14
**Repository:** `healthcareworkspace`
**Current runtime baseline:** Next.js/React EHR host with TypeScript local communication state, same-process v1 route handlers and SSE, an independently buildable but unconsumed React/TypeScript MFE, and a separate custom Go FHIR R4 service.
**Target runtime baseline:** Go communication service, PostgreSQL, an approved event backbone, workers/adapters, approved object storage, and a hardened FHIR R4 integration. These components are not deployed for communication today.
**Jurisdiction:** Ontario, Canada is the intended target. The governing Ontario/program IG, terminology server, profile packages, and partner contract must be selected before interoperability is enabled.

## Current runtime units and ownership

| Unit | Runtime | Current responsibility | Current limit |
|---|---|---|---|
| `ehr/src/app/communication/` | Next.js EHR | Server page data and the clinician Communication Hub UI. | It is the only active host; no other host consumes a shared remote. |
| `UnifiedCommunicationHub.tsx` | React/TypeScript | Folders, channel/view state, conversation selection, composer interaction, drafts, local delivery/timeline rendering, and provider-unavailable states. | It renders synthetic/local state and cannot prove external delivery. |
| `ehr/src/app/api/communication/v1/` | Next.js route handlers | Same-origin inbox, conversation, message, draft, attachment-metadata, call, voicemail, template, directory, and SSE endpoints. | These are not proxy routes to a standalone service. |
| `communicationBff.ts` | TypeScript helper in EHR process | Local actor/context resolution, correlation IDs, response envelopes, problem details, and idempotency-key parsing. | It has no independent deployment, service-to-service authentication, or canonical database. |
| `clinicalCommunicationStore.ts` | TypeScript file-backed store | Conversations, messages, participants, recipient/delivery records, drafts, local tasks, calls, voicemail, attachment metadata, and in-process events. | JSON persistence at `ehr/data/communication_hub.json` is a development seam, not multi-instance transactional storage. |
| `doctorWorkspaceAuth.ts` | EHR authentication helper | Session/role checks and explicit `asUser=dev` preview identity resolution. | The preview path is development-only; tenant, organization, proxy, consent, and jurisdiction policy are not implemented. |
| `events/route.ts` | EHR SSE route | Participant-filtered freshness notifications for the running process. | No durable event log, replay cursor, or cross-process fan-out exists. |
| `communicationProviders.ts` | EHR provider status stub | Explicitly reports email and telephony as unavailable. | No external email, call, media, voicemail, push, or webhook adapter exists. |
| `communication-mfe/` | React/TypeScript Module Federation remote | Exposes `CommunicationHub`, `CommunicationComposer`, and a host contract; remote assets are produced by Rsbuild. | EHR does not load `remoteEntry.js`; standalone type/lint/test hardening remains incomplete. |
| `fhir/` | Custom Go FHIR R4 service | Generic FHIR CRUD/search/history backed by PostgreSQL and a minimal CapabilityStatement. | No Communication-domain mapper, selected profile validation, FHIR messaging, or active EHR communication integration exists. |
| EHR task/audit helpers | Existing EHR code | Some legacy audit behavior and local communication task records. | Communication actions do not consistently use canonical task or immutable audit services. |

### Current local execution rules

- `clinicalCommunicationStore` serializes writes within one Node process and writes a JSON document to the EHR data directory. It has no database transaction, migration, tenant partitioning, distributed locking, durable inbox/outbox, or multi-instance concurrency guarantee.
- A local command is accepted only after local actor, conversation participant, patient, recipient, attachment-reference, and idempotency checks pass. It may be recorded as local acceptance or queued work, but it must not be labelled external delivery.
- Pending attachments are metadata references. They are actor-bound, patient-bound, expiring, and single-use, but no byte upload, checksum verification, malware scan, DLP scan, object storage, or retention workflow is performed.
- SSE receives only events emitted in the current EHR process. A reconnect cannot request missed events from a cursor.
- Call commands record an unavailable provider result. Call/voicemail data visible in the hub is synthetic or local operational state, not a connected telephony/media session.
- The separate FHIR server is not invoked by this flow. It currently advertises `Communication` generic CRUD, but not the complete Communication-domain resource/search/validation surface required for an integration contract.

## 1. Target runtime units and ownership

| Unit | Runtime | Owns | Does not own |
|---|---|---|---|
| `communication-mfe` | React/TypeScript remote | UI, accessibility, draft and panel state, host events | Credentials, persistence, routing, consent, delivery, FHIR mapping |
| EHR communication BFF facade | Existing Next.js EHR process initially; a separately deployed BFF only after an approved ADR | Session propagation, aggregation, response shaping, compatibility-preserving browser API, SSE/freshness | Canonical data, delivery truth, audit truth |
| `communication` REST API | Go HTTP service | Domain aggregates, PostgreSQL transactions, commands, queries, outbox | Browser session UI, provider-specific transport |
| `communication-worker` | Go worker + durable workflow SDK | Delivery workflows, retries, timers, replay, escalation | Canonical message mutation |
| `communication-scanner` | Worker | MIME/signature/malware/DLP scan state | Clinical authorization |
| Channel adapters | Go packages/processes | EHR/PMS/LIMS/hospital/FHIR/email/telephony translation | Canonical message semantics |
| Existing FHIR service | Custom Go FHIR R4 service, hardened or replaced only by an explicit ADR | FHIR resources, profiles, version history, validation | Operational delivery ledger |
| Existing tasks/audit/timeline | Existing Roshi services | Shared task and audit projection | Communication-specific routing decisions |

No target Go communication module or standalone BFF currently exists in `go.work`. The EHR-local facade is the required compatibility layer during extraction. The production service must implement a versioned internal contract without breaking the browser-facing v1 semantics.

## 2. Directory layout

```text
The following is a target layout. Directories under `communication/` and `contracts/communication/` do not exist yet.

```text
contracts/communication/v1/
  bff.openapi.yaml
  communication.openapi.yaml
  events/*.schema.json
  mfe/host-contract.d.ts
  mfe/domain-events.d.ts
communication-mfe/
  src/exposes/CommunicationHub.tsx
  src/exposes/CommunicationComposer.tsx
  src/api/bffClient.ts
  src/state/communicationReducer.ts
  src/state/draftReducer.ts
  src/safety/*.ts
communication/
  cmd/api/main.go
  cmd/worker/main.go
  cmd/attachment-scanner/main.go
  cmd/adapters/{ehr,pms,lims,hospital,email,telephony,voicemail}/
  internal/domain/{conversation,message,participant,delivery,call,voicemail,attachment}
  internal/application/{commands,queries,workflows}
  internal/transport/http/
  internal/persistence/postgres/
  internal/outbox/
  internal/inbox/
  internal/idempotency/
  internal/policy/{authorization,consent,routing,retention}
  internal/fhir/
  internal/audit/
  migrations/
ehr/src/app/communication/
ehr/src/app/api/communication/v1/
deploy/communication/
```

The current working UI remains under `ehr/src/app/communication`. `communication-mfe` becomes an optional host-consumed remote only after a host-loading spike proves version compatibility, integrity/version policy, accessibility, failure fallback, and end-to-end launch-context behavior.

## 3. Relational schema

The following PostgreSQL schema is the target production design. It does not exist in the current EHR local store. The Go communication service owns these tables, with Goose migrations and an approved encryption/key-management approach. All tables include `tenant_id`, `created_at`, and where applicable `updated_at`; all IDs are opaque UUIDs.

### `communication_conversations`

- `id` primary key
- `tenant_id` not null
- `patient_id` nullable
- `encounter_id` nullable
- `appointment_id` nullable
- `topic` not null
- `category` not null
- `priority` not null: `routine|urgent|asap|stat`
- `sensitivity` not null
- `conversation_state` not null
- `owner_team_id` nullable
- `created_by_actor_id` not null
- `created_at`, `updated_at`, `last_activity_at`
- `retention_policy_id` nullable

Indexes: `(tenant_id, last_activity_at desc)`, `(tenant_id, patient_id, last_activity_at desc)`, `(tenant_id, conversation_state)`, `(tenant_id, category, priority)`.

### `communication_participants`

- `id` primary key
- `conversation_id` foreign key
- `actor_type`: `patient|related_person|practitioner|practitioner_role|care_team|organization|service|endpoint|inbox`
- `actor_id` not null
- `role`: `sender|recipient|cc|bcc|watcher|owner`
- `display_name` snapshot for safe display
- `organization_id` nullable
- `patient_scope` nullable
- `permission_snapshot` JSONB
- `created_at`, `removed_at` nullable

Unique index: `(conversation_id, actor_type, actor_id, role)`.

### `communication_messages`

- `id` primary key
- `conversation_id` foreign key
- `sender_actor_id`, `sender_role_id`, `sender_organization_id`
- `subject` nullable
- `body_text` encrypted/text
- `body_html` sanitized/encrypted nullable
- `message_channel`: `secure_message|email|call_note|voicemail_note|system`
- `message_category`, `priority`
- `message_state`
- `submitted_at`, `sent_at`, `received_at`
- `reply_to_message_id`, `supersedes_message_id` nullable
- `requires_acknowledgement` boolean
- `acknowledgement_deadline` nullable
- `action_required` boolean
- `action_due_at` nullable
- `patient_id` nullable and must match conversation patient
- `source_system`, `source_correlation_id`
- `idempotency_key` nullable
- `fhir_resource_id`, `fhir_resource_version` nullable
- `created_at`

Unique index: `(tenant_id, sender_actor_id, idempotency_key)` where key is not null. Indexes: `(conversation_id, created_at)`, `(tenant_id, patient_id, created_at)`, full-text index over approved searchable text, `(tenant_id, message_state)`.

### `communication_recipients`

- `id` primary key
- `message_id` foreign key
- `participant_id` foreign key
- `recipient_kind`: `to|cc|bcc`
- `routing_policy_version`
- `resolved_endpoint_id` nullable
- `consent_decision` not null
- `created_at`

Unique index: `(message_id, participant_id, recipient_kind)`.

### `communication_deliveries`

- `id` primary key
- `message_id`, `recipient_id`
- `channel`: `secure_message|fhir|direct|smime_email|secure_email|standard_email|portal`
- `delivery_state`
- `endpoint_id`
- `attempt_count`
- `next_attempt_at`, `last_attempt_at`
- `accepted_at`, `system_delivered_at`, `inbox_delivered_at`, `read_at`, `acknowledged_at`, `actioned_at`
- `last_error_code` nullable
- `workflow_id` nullable
- `fallback_of_delivery_id` nullable
- `manual_confirmation_id` nullable
- `created_at`, `updated_at`

Unique index: `(tenant_id, message_id, recipient_id, channel)`.

### `communication_delivery_attempts`

- `id` primary key
- `delivery_id`
- `attempt_number`
- `started_at`, `completed_at`
- `transport_result`: `accepted|deferred|failed|bounced|unknown`
- `provider_code`, `safe_provider_detail`
- `correlation_id`
- `created_at`

Unique index: `(delivery_id, attempt_number)`.

### `communication_attachments`

- `id` primary key
- `tenant_id`, `patient_id` nullable
- `message_id` nullable while draft
- `filename`, `content_type`, `size_bytes`, `sha256`
- `source_type`, `source_id`, `source_version` nullable
- `storage_key`
- `scan_state`: `uploading|uploaded|scanning|safe|blocked|failed|available|expired`
- `scan_provider`, `scan_completed_at`
- `uploaded_by_actor_id`, `created_at`, `expires_at`

Unique index: `(tenant_id, sha256, size_bytes)` for deduplicated content where permitted. Index `(tenant_id, message_id)`.

### `communication_calls`

- `id`, `tenant_id`, `conversation_id` nullable
- `patient_id` nullable
- `initiated_by_actor_id`
- `call_direction`: `inbound|outbound`
- `call_state`: `created|dialing|ringing|connecting|connected|on_hold|transferring|conferencing|ending|ended|busy|no_answer|declined|failed|dropped|cancelled`
- `provider`, `provider_call_id`
- `started_at`, `connected_at`, `ended_at`
- `duration_seconds`
- `disposition_code`
- `recording_state`, `recording_consent_id`, `recording_storage_key` nullable
- `transcription_state`, `transcript_storage_key` nullable
- `created_at`, `updated_at`

Unique index: `(tenant_id, provider, provider_call_id)` where provider ID is not null. Index `(tenant_id, patient_id, created_at desc)`.

### `communication_call_participants`

- `id`, `call_id`
- `actor_type`, `actor_id`, `display_name`
- `role`, `phone_e164` nullable
- `joined_at`, `left_at`
- `muted`, `on_hold`, `transfer_state`

### `communication_voicemails`

- `id`, `tenant_id`, `conversation_id` nullable, `patient_id` nullable
- `call_id`, `caller_endpoint_id` nullable
- `audio_storage_key`, `duration_seconds`
- `voicemail_state`: `receiving|processing|available|unread|reviewed|action_required|resolved|archived|failed_processing`
- `transcription_state`, `transcript_storage_key` nullable
- `priority`, `assigned_actor_id` nullable, `callback_state`
- `received_at`, `reviewed_at`

### `communication_acknowledgements`

- `id`, `tenant_id`, `message_id`, `delivery_id` nullable
- `actor_id`, `system_id`
- `acknowledgement_type`: `clinical|delivery|manual`
- `recorded_at`, `note` nullable

Unique index: `(tenant_id, message_id, delivery_id, actor_id, acknowledgement_type)`.

### `communication_clinical_actions`

- `id`, `tenant_id`, `conversation_id`, `source_message_id`
- `action_type`, `status`, `owner_actor_id`, `due_at`
- `linked_resource_type`, `linked_resource_id`
- `created_at`, `completed_at`

### `communication_idempotency_keys`

- `tenant_id`, `actor_id`, `operation`, `key`
- `request_hash`, `response_status`, `response_body_encrypted`
- `created_at`, `expires_at`

Primary key: `(tenant_id, actor_id, operation, key)`.

### `communication_inbox_receipts`

- `id`, `tenant_id`, `source_system`, `external_message_id`
- `message_hash`, `received_at`, `processed_at`
- `processing_state`, `response_reference`

Unique index: `(tenant_id, source_system, external_message_id)`.

### `communication_outbox_events`

- `id`, `tenant_id`, `event_type`, `event_version`
- `aggregate_type`, `aggregate_id`, `payload_encrypted`
- `occurred_at`, `published_at`, `attempt_count`, `last_error`

Index: `(published_at, occurred_at)` where published_at is null.

### `communication_endpoint_registry`

- `id`, `tenant_id`, `organization_id`
- `endpoint_type`, `address`, `capabilities` JSONB
- `trust_status`, `verification_state`, `preferred_channel`, `fallback_policy`
- `health_state`, `circuit_state`, `last_heartbeat_at`
- `configuration_version`, `created_at`, `updated_at`

## 4. Target commands and queries

### Commands

- `CreateConversation`
- `SaveDraft`
- `SubmitMessage`
- `SupersedeMessage`
- `RecallMessage`
- `MarkMessageRead`
- `RecordAcknowledgement`
- `RecordManualDeliveryConfirmation`
- `CreateClinicalAction`
- `CreateTaskFromMessage`
- `ResolveConversation`
- `CloseConversation`
- `UploadAttachment`
- `ApproveAttachment`
- `StartCall`
- `AnswerCall`
- `DeclineCall`
- `HoldCall`
- `ResumeCall`
- `TransferCall`
- `AddCallParticipant`
- `EndCall`
- `SetCallDisposition`
- `SaveCallNote`
- `CreateVoicemailCallback`
- `ReviewVoicemail`
- `AssignCommunication`
- `RetryDelivery`
- `ChangeDeliveryChannel`

Every command carries actor, tenant, organization, patient/context, correlation ID, causation ID, and idempotency key where replay could cause a duplicate side effect.

### Queries

- `GetCommunicationInbox`
- `GetConversation`
- `GetConversationTimeline`
- `SearchCommunications`
- `GetPatientCommunicationContext`
- `GetDeliveryDetails`
- `GetDirectoryRecipients`
- `GetEndpointHealth`
- `GetTemplates`
- `GetTasksForCommunication`
- `GetCall`
- `GetVoicemailInbox`
- `GetCommunicationAudit`

Queries return cursor-based results and explicit `stale`, `partial`, `withheld`, and `unavailable` states.

## 5. API contracts and extraction boundary

### Current local v1 facade

The active v1 facade is implemented as Next.js route handlers under `ehr/src/app/api/communication/v1/`. It exposes local inbox, conversation, message, draft, attachment-metadata, call, voicemail, recipient directory, templates, and SSE workflows. Its success response uses a `data`, `warnings`, and `meta` envelope with `projectionRevision: "local-file-store"`; failures use `application/problem+json` and a correlation ID.

There is no published OpenAPI contract, standalone Go domain endpoint, internal service authentication, or downstream BFF aggregation today. The browser contract below is the extraction target: existing local routes must preserve compatible path, method, idempotency, correlation, error, and response semantics while delegating to the future service.

### Target BFF routes

### BFF routes

```text
GET  /api/communication/v1/inbox?folder=inbox&channel=all&cursor=&limit=&q=
GET  /api/communication/v1/conversations/{conversationId}
GET  /api/communication/v1/conversations/{conversationId}/timeline
POST /api/communication/v1/conversations
POST /api/communication/v1/conversations/{conversationId}/messages
PATCH /api/communication/v1/drafts/{draftId}
POST /api/communication/v1/messages/{messageId}/read
POST /api/communication/v1/messages/{messageId}/acknowledgements
POST /api/communication/v1/messages/{messageId}/manual-delivery-confirmations
POST /api/communication/v1/messages/{messageId}/tasks
POST /api/communication/v1/attachments/presign
POST /api/communication/v1/calls
PATCH /api/communication/v1/calls/{callId}
PATCH /api/communication/v1/voicemails/{voicemailId}
GET  /api/communication/v1/directory/recipients?q=&patientId=&capability=
GET  /api/communication/v1/templates?category=
GET  /api/communication/v1/events
```

### Target domain REST routes

```text
GET  /v1/conversations
POST /v1/conversations
GET  /v1/conversations/{conversationId}
POST /v1/conversations/{conversationId}/messages
POST /v1/messages/{messageId}/read
POST /v1/messages/{messageId}/acknowledgements
POST /v1/messages/{messageId}/manual-delivery-confirmations
POST /v1/messages/{messageId}/tasks
GET  /v1/messages/{messageId}/deliveries
POST /v1/deliveries/{deliveryId}/retry
POST /v1/deliveries/{deliveryId}/channel-change
POST /v1/attachments/presign
POST /v1/attachments/{attachmentId}/complete
GET  /v1/directory/recipients
GET  /v1/endpoints/health
POST /v1/calls
PATCH /v1/calls/{callId}
POST /v1/calls/{callId}/participants
POST /v1/calls/{callId}/notes
PATCH /v1/voicemails/{voicemailId}
GET  /v1/operations/exceptions
```

All commands accept `Idempotency-Key`; all responses include a correlation ID. BFF success shape:

```json
{
  "data": {},
  "warnings": [],
  "meta": {
    "correlationId": "opaque-correlation-id",
    "generatedAt": "2026-08-26T12:00:00Z",
    "projectionRevision": "opaque-revision",
    "nextCursor": null
  }
}
```

Errors use `application/problem+json`:

```json
{
  "type": "https://roshi.health/problems/patient-context-mismatch",
  "title": "Patient context does not match",
  "status": 422,
  "code": "PATIENT_CONTEXT_MISMATCH",
  "detail": "The selected source record belongs to a different patient.",
  "retryable": false,
  "correlationId": "opaque-correlation-id"
}
```

## 6. FHIR mapping and terminology controls

### Current state

No Communication-domain mapper or FHIR client call is wired into the active hub. The Go FHIR server provides generic raw-JSON resource persistence and history. It currently stamps resource metadata and needs explicit hardening for required `meta.profile` and security-label preservation before profile conformance can be asserted. Its Ontario validator does not validate `Communication` resources. The current CapabilityStatement is also not evidence of partner-specific search parameters or FHIR message Bundle support.

### Target FHIR R4 mapper

The future `communication/internal/fhir` adapter creates clinical-record projections through the selected FHIR service contract. It does not dual-write operational delivery truth into FHIR and does not make FHIR the message broker.

| Domain concept | Target FHIR R4 mapping | Constraint |
|---|---|---|
| Retained patient-linked message | `Communication.subject` references `Patient` or `Group`; `topic` captures the clinical topic; `payload.contentString` carries the retained body. | `subject` is not the email subject string. Project only clinical-record content approved by policy. |
| Reply and clinical context | `inResponseTo`, `encounter`, and `about` link the exact related communication/context resources. | References require authorization and valid identifiers. |
| Sender and recipients | Use only permitted R4 reference types for `sender`/`recipient`. | `Endpoint` is routing infrastructure, not a clinical sender/recipient identity; `CareTeam` is recipient-only. |
| Requested future communication | `CommunicationRequest`, with fulfilled `Communication` linked through `basedOn`. | Use only for a genuine request or planned outreach, not a queued delivery. |
| Attachments | `Communication.payload.contentAttachment` for message content. `DocumentReference` for an independently managed clinical document; `Binary` only with approved retrieval/access controls. | No local metadata-only or unscanned attachment projection. |
| Follow-up task | Canonical `Task.focus` references the Communication only when that message is the task subject; otherwise it references the clinical resource. | The existing task service owns task lifecycle. |
| Calls and voicemail | Keep operational call/voicemail records in the communication domain. Project clinically retained content only if the selected policy/model permits it. | No direct mapping of telephony state to `Communication.status`. |
| Delivery/read/acknowledgement | Per-recipient delivery ledger outside FHIR. | `Communication.status` is never an operational delivery state. |
| Audit/provenance/consent | `AuditEvent` records access/disclosure/action; `Provenance` records creation/transformation; `Consent` is a directive input. | None replaces authorization or the canonical record. |

### Terminology release gate

The mapper cannot emit external FHIR payloads until the team records the Ontario/program or trading-partner IG, package/version, profile canonical URLs, CapabilityStatement, identifier policy, terminology server, code-system/value-set versions, binding strengths, ConceptMap/unmapped behavior, and EN/FR display policy where required.

Internal `delivery_state`, `transport_result`, `message_channel`, scan/call/voicemail/recording/transcription state, endpoint health, circuit state, provider code, and retry details remain local/configurable operational values. `category`, `priority`, `sensitivity`, call disposition, action type, and consent decision require governed terminology before exchange. Morgan supplies the terminology handoff; Alex approves the resulting profiles, mapper, validation package, and interoperability fixtures.

## 7. Target event names and queues

Events use lowercase dot-separated names and explicit versions:

```text
communication.conversation.created.v1
communication.message.draft-created.v1
communication.message.submitted.v1
communication.message.accepted.v1
communication.message.superseded.v1
communication.attachment.scan-started.v1
communication.attachment.safe.v1
communication.attachment.blocked.v1
communication.delivery.created.v1
communication.delivery.queued.v1
communication.delivery.attempted.v1
communication.delivery.endpoint-accepted.v1
communication.delivery.system-delivered.v1
communication.delivery.inbox-delivered.v1
communication.delivery.deferred.v1
communication.delivery.retry-scheduled.v1
communication.delivery.failed.v1
communication.delivery.fallback-started.v1
communication.delivery.email-accepted.v1
communication.delivery.email-bounced.v1
communication.recipient.read.v1
communication.recipient.acknowledged.v1
communication.manual-confirmation.recorded.v1
communication.endpoint.degraded.v1
communication.endpoint.recovered.v1
communication.call.created.v1
communication.call.ringing.v1
communication.call.connected.v1
communication.call.hold-started.v1
communication.call.transfer-completed.v1
communication.call.transfer-failed.v1
communication.call.ended.v1
communication.call.failed.v1
communication.voicemail.available.v1
communication.voicemail.reviewed.v1
communication.task.created.v1
communication.task.completed.v1
```

Logical queues/topics:

```text
communication.outbox.publish
communication.delivery.route
communication.delivery.secure-message
communication.delivery.fhir
communication.delivery.email
communication.delivery.pms
communication.delivery.lims
communication.delivery.hospital
communication.delivery.telephony
communication.delivery.voicemail
communication.attachment.scan
communication.acknowledgement.deadlines
communication.endpoint.recovery
communication.exceptions.dead-letter
communication.ui.refresh
```

Event envelope:

```json
{
  "eventId": "uuid",
  "eventType": "communication.delivery.queued.v1",
  "eventVersion": 1,
  "occurredAt": "2026-08-26T12:00:00Z",
  "actorId": "opaque-actor",
  "tenantId": "opaque-tenant",
  "conversationId": "uuid",
  "messageId": "uuid",
  "deliveryId": "uuid",
  "callId": null,
  "recipientId": "uuid",
  "correlationId": "uuid",
  "causationId": "uuid",
  "sourceSystem": "communication-api",
  "data": {}
}
```

Broad UI refresh events contain IDs and state summaries only. Full PHI stays behind authorized reads.

## 8. Target delivery workflow

1. Validate request and actor context.
2. Resolve patient/context and enforce single-patient rule.
3. Resolve recipients from the directory.
4. Evaluate consent, security, jurisdiction, capabilities, and fallback policy.
5. Confirm required attachments are `SAFE`/`AVAILABLE`.
6. Insert conversation/message/recipients/delivery rows and outbox event in one transaction.
7. Return `201` durable acceptance with per-recipient `QUEUED` states.
8. Publish outbox event and start one workflow per message/recipient/channel plan.
9. Execute adapter activity with endpoint-specific timeout and idempotency key.
10. Append delivery attempt and state events in a transaction.
11. Schedule retry with exponential backoff plus jitter for transient failure.
12. Start permitted fallback without changing primary delivery state.
13. On recovery, replay pending primary delivery by policy.
14. Record system delivery, inbox delivery, read, acknowledgement, and action independently.
15. Escalate critical or urgent acknowledgement deadlines according to tenant policy.

Retry sequence defaults to `5s, 15s, 1m, 5m, 15m, 1h, 4h`; tenant/channel/priority policy can override it. Do not retry invalid recipients, authorization failures, malware, policy blocks, patient mismatch, invalid payloads, or permanent bounces until corrected.

Circuit breaker states are `CLOSED`, `OPEN`, and `HALF_OPEN`. Health is `UP`, `DEGRADED`, `DOWN`, or `UNKNOWN`. A readiness failure removes an API instance from traffic; endpoint health does not cause accepted messages to be discarded.

## 9. Target calling and voicemail implementation

### Telephony provider interface

```text
type TelephonyProvider interface {
  Dial(ctx, DialRequest) (ProviderCall, error)
  Answer(ctx, ProviderCallID) error
  Hangup(ctx, ProviderCallID) error
  Hold(ctx, ProviderCallID) error
  Resume(ctx, ProviderCallID) error
  Transfer(ctx, ProviderCallID, TransferRequest) error
  AddParticipant(ctx, ProviderCallID, ParticipantRequest) error
  RemoveParticipant(ctx, ProviderCallID, ParticipantID) error
  SendDTMF(ctx, ProviderCallID, Digits) error
  StartRecording(ctx, ProviderCallID, ConsentReference) error
  StopRecording(ctx, ProviderCallID) error
  Events(ctx) (<-chan ProviderCallEvent, error)
}
```

Provider events are translated to domain call events. Provider call IDs are never exposed as the clinical identity of a call.

### Call transition rules

- `CREATED -> DIALING -> RINGING -> CONNECTING -> CONNECTED`.
- `CONNECTED -> ON_HOLD -> CONNECTED`.
- `CONNECTED -> TRANSFERRING -> CONNECTED|ENDED|FAILED`.
- `CONNECTED -> CONFERENCING -> CONNECTED|ENDED`.
- Any active state may transition to `DROPPED`, `FAILED`, `CANCELLED`, or `ENDING -> ENDED` according to provider evidence.
- Recording requires policy evaluation and recorded consent/notification before provider start.
- Call notes are operational by default; clinical note creation is explicit.
- End requires or prompts for coded disposition where policy requires it.

### Voicemail processing

1. Receive provider voicemail event.
2. Persist call/voicemail record and audio reference.
3. Scan and validate audio metadata.
4. Optionally transcribe only under tenant/jurisdiction policy.
5. Match caller using verified directory data; ambiguous matches require user selection.
6. Create or attach to a conversation only after safe match.
7. Notify authorized inbox and optionally create one policy-controlled task.
8. Record play/review/callback events in audit.

## 10. Authorization checks

### Current local checks

The current facade resolves an authenticated session or explicit development preview actor, then checks conversation participation, patient/recipient consistency, local attachment ownership/expiry/single-use, and local acknowledgement ownership. This is intentionally narrower than production policy and cannot be relied upon for tenant, organization, care-team, proxy, consent, recording, jurisdiction, forwarding, download, or external-recipient authorization.

### Target policy checks

Before any operation, the policy service evaluates:

```text
authenticatedActor
activeTenant
actorOrganization
patientAccess
conversationAccess
recipientAuthorization
sourceResourceAccess
attachmentAccess
sendPermission
forwardPermission
callPermission
recordingPermission
transcriptionPermission
downloadPermission
manualConfirmationPermission
proxyPermission
consentPolicy
jurisdictionPolicy
```

The API denies mismatched patient context, unknown recipient, disallowed channel downgrade, unverified email, unapproved recording, expired attachment token, and cross-tenant access. UI hiding is never the only protection.

## 11. MFE contract

### Current state

`communication-mfe` already exposes a TypeScript host-contract module, but the EHR does not import it or load the remote. The active EHR Hub is the required fallback until remote integration passes a host-compatibility and failure-mode spike.

### Target host contract

```ts
export type CommunicationHostContract = {
  apiBasePath: string;
  launchContext: {
    patientId?: string;
    encounterId?: string;
    appointmentId?: string;
    sourceResource?: { type: string; id: string; version?: string };
  };
  locale: 'en' | 'fr';
  density?: 'comfortable' | 'compact';
  capabilities: string[];
  featureFlags: Record<string, boolean>;
  navigate: (request: { target: string; id?: string }) => void;
  emit: (event: CommunicationDomainEvent) => void;
};
```

Exposed entries:

```text
./CommunicationHub
./CommunicationComposer
./host-contract
```

Required MFE states include loading, empty, stale, partial, permission denied, unavailable, retrying, draft saving, send review, attachment scanning, delivery pending, fallback accepted, acknowledged, overdue, call reconnecting, and provider unavailable.

## 12. UI routes and controls

### Current state

The EHR currently owns `/communication`, `/communication/messages`, `/communication/email`, and `/communication/calls`. These routes render the EHR-local implementation and must keep unavailable external capabilities visibly unavailable. The current UI is not evidence that email, external secure messaging, phone, media, attachment upload, or transcript playback is connected.

### Target composition

Host routes:

```text
/communication
/communication/messages
/communication/email
/communication/calls
```

Hub layout:

- Left: folders and filters.
- Center: conversation list with search, channel, patient, category, priority, unread, action, and delivery filters.
- Right: active conversation with Messages/Timeline toggle, clinical context, delivery drawer, action center, and composer.
- Mobile: Inbox -> Thread -> Details with full-screen call and persistent mini-call bar.

Components:

```text
CommunicationHub
CommunicationNavigation
CommunicationInbox
ConversationList
ConversationRow
ConversationHeader
MessageThread
MessageEvent
TimelineView
PatientContextPanel
CommunicationComposer
RecipientPicker
ClinicalContextPicker
TemplatePicker
AttachmentPicker
AttachmentStatusList
SendReviewModal
DeliveryDetailsDrawer
CallWorkspace
MiniCallBar
CallControls
ParticipantPanel
CallNotesPanel
CallDispositionDialog
VoicemailInbox
VoicemailReviewDrawer
CommunicationActionCenter
TaskCreateDialog
AiSummaryPanel
SafetyNotice
PermissionState
```

Visible actions must call a BFF command or host navigation callback. No empty handlers, console-only actions, fake dropdowns, or claims of external delivery in provider-free mode.

## 13. Error codes

The current `communicationBff.ts` maps a local subset of these codes to problem details. The full list becomes a versioned service contract only when the communication service and its OpenAPI definition are introduced.

```text
RECIPIENT_NOT_FOUND
RECIPIENT_NOT_AUTHORIZED
PATIENT_CONTEXT_MISMATCH
PERMISSION_DENIED
CONSENT_RESTRICTION
POLICY_BLOCKED
INVALID_DESTINATION
INVALID_FHIR
CONCURRENCY_CONFLICT
IDEMPOTENCY_CONFLICT
DUPLICATE_MESSAGE
ATTACHMENT_BLOCKED
ATTACHMENT_NOT_SAFE
ATTACHMENT_TOO_LARGE
ATTACHMENT_SCAN_FAILED
ENDPOINT_UNAVAILABLE
DELIVERY_TIMEOUT
DELIVERY_FAILED
EMAIL_BOUNCED
TELEPHONY_UNAVAILABLE
CALL_FAILED
TRANSFER_FAILED
RECORDING_NOT_ALLOWED
TRANSCRIPTION_NOT_ALLOWED
VOICEMAIL_PROCESSING_FAILED
SOURCE_UNAVAILABLE
RATE_LIMITED
```

## 14. Target migrations and deployment

Migration order:

1. `communication_conversations_participants`.
2. `communication_messages_recipients`.
3. `communication_deliveries_attempts`.
4. `communication_attachments`.
5. `communication_calls_participants_voicemails`.
6. `communication_acknowledgements_actions`.
7. `communication_idempotency_inbox_outbox`.
8. `communication_endpoint_registry`.
9. indexes, encryption metadata, retention, and reconciliation views.

Update the root `go.work` with `./communication` when that module is introduced. Do not create a separate `communication-bff` module without an ADR demonstrating why the EHR facade cannot remain the BFF. The repository has no current communication Kubernetes/GitHub Actions delivery pipeline; deployment artifacts, release gates, secret handling, and remote smoke tests are work to be delivered. MFE assets use immutable versioned manifests and a last-known-good fallback only after host consumption is enabled.

## 15. Test matrix

### Current local verification

Focused EHR communication tests cover local store behavior and the hub route. The 2026-09-13 audit recorded focused ESLint, Vitest, Playwright, and EHR build success for the communication slice. The repository-wide baseline on 2026-09-14 has unrelated health-record fixture drift and a Windows JSON-file rename collision while the app is running; the full lint command also has substantial pre-existing non-communication debt. These failures must be triaged separately and cannot be used to claim a production communication release.

### Target test matrix

### Domain and API

- Conversation single-patient invariant.
- Immutable submitted message and supersession.
- Multi-recipient delivery independence.
- Idempotent duplicate submit, task, acknowledgement, call, and voicemail events.
- Authorization, tenant isolation, consent, proxy, source-resource, forwarding, download, and recording policy.
- Problem-details response and safe technical error mapping.

### Reliability

- Transaction rollback prevents message without outbox.
- Outbox replay is idempotent.
- Receiver inbox deduplicates repeated external messages.
- Endpoint timeout/503/SMTP 4xx retry with jitter.
- Permanent error does not retry endlessly.
- Circuit breaker opens and closes correctly.
- PMS/LIMS/EHR outage preserves queued delivery.
- Fallback does not complete primary delivery.
- Recovery replays the original canonical message exactly once at the receiver.
- Manual confirmation does not overwrite machine state.

### Attachments and FHIR

- MIME and signature mismatch.
- Malware/DLP block.
- Size and total-count policy.
- Wrong-patient source attachment.
- Scan failure and expiry.
- Exact DocumentReference/Binary linkage.
- FHIR `Communication` and `CommunicationRequest` mapping.
- MessageHeader-first Bundle validation.
- FHIR version/profile preservation and Provenance.

### Email

- Inbox, Sent, Drafts, threading, reply, reply-all, forward, CC/BCC policy, multiple attachments, autosave, secure-link fallback, bounce, retry, inbound token resolution, unmatched triage, and no tracking-pixel read truth.

### Phone and voicemail

- Outbound/inbound, answer/decline, busy/no-answer, missed call, hold/resume, DTMF, warm/blind transfer, transfer failure, conference, participant state, drop/reconnect, notes, disposition, callback, scheduled call, recording consent, transcription policy, voicemail processing, playback, review, and callback.

### UI and accessibility

- MFE contract and manifest loading.
- Host fallback and version incompatibility.
- Keyboard/focus trap/Escape/unsaved draft.
- Screen-reader names and live status.
- 3-column desktop, tablet details drawer, mobile Inbox -> Thread -> Details.
- Visual regression for inbox, composer, delivery drawer, timeline, incoming/active/held/transfer/conference call, voicemail, and mini-call bar.
- Every visible control has a tested behavior.

### Integration

- EHR -> PMS online and offline.
- PMS -> clinician clarification.
- LIMS critical result -> acknowledgement -> escalation.
- Hospital discharge -> family physician.
- Patient -> care-team triage.
- One conversation containing secure message, email, call, voicemail, delivery event, task, and resolution.

## 16. Target observability

Metrics:

```text
communication_messages_accepted_total
communication_delivery_latency_seconds
communication_delivery_attempts_total
communication_delivery_failures_total
communication_delivery_retry_queue_depth
communication_fallback_total
communication_email_bounces_total
communication_endpoint_health
communication_circuit_state
communication_attachment_scan_failures_total
communication_voicemail_backlog
communication_calls_initiated_total
communication_calls_connected_total
communication_call_drops_total
communication_transfer_failures_total
communication_acknowledgement_latency_seconds
communication_acknowledgement_overdue_total
communication_outbox_lag_seconds
communication_projection_lag_seconds
communication_sse_reconnect_total
```

Trace attributes use opaque tenant, actor, conversation, message, delivery, call, and correlation IDs. Do not log bodies, full addresses, access tokens, audio, transcripts, or unnecessary patient identifiers.

## 17. Local provider policy and production gate

Local mode persists fixture/local state and explicitly unavailable provider status through the existing development data seam. Secure message operations are usable only as local workflow behavior. Email, PSTN, SIP, WebRTC, recording, transcription, push, and external secure-messaging actions return explicit provider/policy states until approved adapters, secrets, webhooks, retention, audit, and operational controls are configured. The UI never labels a local action as external delivery.

Production release is blocked until durable storage, outbox/inbox/replay, policy enforcement, canonical task/audit integration, attachment scanning, provider onboarding, FHIR/terminology approval, deployable runtime units, observability, recovery, and remote validation are complete.

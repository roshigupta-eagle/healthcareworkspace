# Communication Hub Current-State Audit

**Audit date:** 2026-08-26
**Environment:** Local Roshi EHR at `http://localhost:3000/communication?asUser=dev`
**Evidence:** Live HTTP checks, browser interaction checks at 1440x900, and source inspection. Synthetic development data only.

| FEATURE | CURRENT STATE | EXPECTED STATE | STATUS | BUG / GAP | PRIORITY | IMPLEMENTATION LOCATION | TEST REQUIRED |
|---|---|---|---|---|---|---|---|
| Communication Hub route | HTTP 200 and unified shell render. | One usable command center for all channels. | WORKING | Channel-specific behavior is incomplete. | P0 | `ehr/src/app/communication/` | E2E route and auth tests. |
| HLD and LLD | Both documents exist and cover MFE, BFF, REST, reliability, FHIR, calls, and voicemail. | Documents stay aligned with implementation. | WORKING | Deviations require closure or documentation. | P0 | `docs/communications/HLD.md`, `LLD.md` | Traceability review. |
| Communication MFE | Standalone package emits remote assets and manifest. | Independently buildable, tested, versioned remote consumed by hosts. | PARTIAL | TypeScript failure; no EHR host consumption; lint/test harness incomplete. | P0 | `communication-mfe/` | Typecheck, lint, unit, manifest smoke test. |
| BFF boundary | Same-origin Next API routes return structured envelopes. | BFF protects browser access and aggregates authorized data. | PARTIAL | BFF is still inside EHR; no standalone Go deployment. | P0 | `ehr/src/lib/communicationBff.ts`, `ehr/src/app/api/communication/v1/` | Contract and authorization tests. |
| REST communication service | Domain-shaped conversation/message/attachment/call/voicemail/task routes exist. | Standalone REST service owns canonical operational state. | PARTIAL | Current implementation is file-backed EHR code. | P0 | `ehr/src/lib/clinicalCommunicationStore.ts` | Service contract and persistence tests. |
| Secure messages | Seeded secure messages render and the contract supports reads and replies. | Persistent threads, reply, acknowledge, tasks, search, and audit. | PARTIAL | Task, audit, and FHIR integration is not canonical across hosts. | P0 | `clinicalCommunicationStore.ts`, `UnifiedCommunicationHub.tsx` | Send, reply, refresh, duplicate, read, and ack E2E. |
| All Communications | Mixed pharmacy thread includes message, call, delivery, task, and timeline events. | One thread contains permitted channel records. | PARTIAL | Channel indicators and event composition need refinement. | P1 | `UnifiedCommunicationHub.tsx` | Mixed-channel timeline test. |
| Email mode synchronization | Browser test: empty list but center still shows the pharmacy thread. | Filtered list and selected thread must agree. | BROKEN | Selection is not cleared when mode results change. | P0 | `UnifiedCommunicationHub.tsx` mode/filter state | Email empty-state reconciliation E2E. |
| Email product | Provider strip truthfully says no provider configured. | Full email experience with provider; safe setup/fallback without one. | MOCKED | No provider, email metadata, reply-all/forward/CC/BCC workflow. | P0 | `clinicalCommunicationStore.ts`, hub UI | Provider absent/configured tests. |
| Calls mode | Seeded call records append to a message thread; unavailable provider is recorded. | Call-centric list, details, controls, notes, disposition, and mini-player. | PARTIAL | Calls mode remains message-centered; no provider adapter. | P0 | `UnifiedCommunicationHub.tsx`, `clinicalCommunicationStore.ts` | Call state and provider failure E2E. |
| Voicemail mode | Seeded voicemail and review/callback route exist. | Voicemail inbox, player, transcript, callback, assignment, archive, and task. | PARTIAL | Mode can show a pharmacy thread; no player or assignment/archive UI. | P0 | `UnifiedCommunicationHub.tsx`, voicemail route | Voicemail-only selection and player tests. |
| Timeline mode | Meaningful seeded events render for selected conversation. | Chronological readable history with source/detail actions. | PARTIAL | Event selection/source navigation and URL state are incomplete. | P1 | `UnifiedCommunicationHub.tsx`, store | Chronology and source tests. |
| Folder/channel URL state | Separate component state exists for folder and mode. | URL-addressable independent folder/channel/view state. | PARTIAL | Query values are not fully applied on initial render or all refreshes. | P0 | `communicationHubPageData.ts`, `UnifiedCommunicationHub.tsx` | Combination and back/forward tests. |
| Attachments | Presign-like route validates content type/size and returns local safe metadata. | Controlled upload, scan, DLP, storage, retry/cancel, and source linkage. | PARTIAL | Local storage reference is synthetic; no binary upload, malware service, or durable scan lifecycle. | P0 | `attachments/presign/route.ts`, `clinicalCommunicationStore.ts` | Valid, duplicate, unsupported, oversized, blocked, retry, and wrong-patient tests. |
| Patient context | Synthetic patient name, MRN, conditions, medications, labs, and risk render. | Authorized, failure-tolerant context with exact source references. | PARTIAL | No independent context failure state; local identity is always verified. | P0 | `clinicalCommunicationStore.ts`, details rail | Context failure, mismatch, authorization, and long-data tests. |
| FHIR mapping | HLD/LLD define Communication, CommunicationRequest, Task, DocumentReference, Binary, Bundle, MessageHeader, Provenance, and AuditEvent mapping. | Versioned server-side mapping against configured FHIR profiles and validation. | NOT IMPLEMENTED | No communication-domain mapper or FHIR adapter is wired into this slice. | P0 | `docs/communications/LLD.md`; planned `fhir/internal/communication/` | FHIR R4 resource and Bundle validation tests. |
| Outbox/inbox/idempotency | Commands accept `Idempotency-Key`; local duplicate lookup is in-process; SSE is in memory. | Transactional outbox, durable receiver inbox, replay, and process-independent idempotency. | PARTIAL | No durable outbox worker or receiver inbox ledger exists. | P0 | `clinicalCommunicationStore.ts`, `communicationBff.ts` | Restart, duplicate event, timeout retry, rollback, and deduplication tests. |
| Delivery ledger and fallback | Seeded delivery records show PMS deferred and secure email accepted; local sends record state. | Per-recipient attempts, retries, fallback, recovery replay, and precise truth. | PARTIAL | State is not driven by a durable worker or provider; no recovery replay service exists. | P0 | `clinicalCommunicationStore.ts`, delivery routes | PMS-down, fallback, bounce, recovery, ordering, and manual-confirmation tests. |
| Endpoint health | Pharmacy PMS is shown as down in the local endpoint card and warning. | Endpoint registry and health service with heartbeat, circuit breaker, queue depth, and recovery. | MOCKED | Health is seed data; no heartbeat, circuit breaker, or endpoint details API. | P0 | `clinicalCommunicationStore.ts`, endpoint UI | Health transition, circuit breaker, recovery, and operator tests. |
| Tasks integration | Conversation displays tasks and a local create-task route exists. | Canonical Tasks and Inbox task linked to exact Communication/Task.focus. | PARTIAL | Tasks are stored inside the local communication file, not the existing canonical task store. | P0 | `messages/[messageId]/tasks/route.ts`, `clinicalCommunicationStore.ts`, `ehr/src/lib/tasksStore.ts` | Cross-store creation, completion, linkage, deduplication, and audit tests. |
| Audit | Legacy message routes call the EHR audit helper; new communication events stay in conversation data. | Every meaningful read/write/delivery/call/voicemail/task/export/download action is immutable and auditable. | PARTIAL | New BFF/domain actions do not consistently call the audit helper or a durable audit service. | P0 | `ehr/src/lib/audit.ts`, communication routes/store | Audit completeness, denied access, read, send, call, voicemail, download, and manual-confirmation tests. |
| Authorization and consent | Clinical roles are restricted and explicit development preview is supported. | Tenant, organization, patient, source, recipient, channel, proxy, recording, and consent policy enforcement. | PARTIAL | Preview bypass is intentional; fine-grained consent and multi-tenant policies are not implemented. | P0 | `doctorWorkspaceAuth.ts`, `communicationBff.ts`, planned policy service | Cross-tenant, unauthorized patient/source/recipient/channel/recording tests. |
| AI summaries | Rules-based local summary is labeled local and warns users to review originals. | Optional source-traceable AI summary/suggestions with human confirmation and failure isolation. | PARTIAL | No configured AI provider, source citations, attachment citations, or suggestion workflow. | P1 | `clinicalCommunicationStore.ts`, `UnifiedCommunicationHub.tsx` | Traceability, unavailable provider, non-invention, and no-autonomous-action tests. |
| Realtime | In-process subscribers and SSE route exist. | Reconnectable freshness updates for message, delivery, call, voicemail, task, recovery, and acknowledgement events. | PARTIAL | Events do not cross processes and there is no durable replay cursor. | P1 | `events/route.ts`, `clinicalCommunicationStore.ts` | Multi-tab, reconnect, replay, and no-work-loss tests. |
| Existing host integrations | EHR navigation and some appointment/chart workflows link to communication. | EHR, PMS, LIMS, hospital, patient portal, medication, lab, appointment, task, and Doctor View context launches. | PARTIAL | Most links target legacy message routes; other hosts do not consume the shared MFE/BFF contract. | P0 | EHR routes/components and host contract | Context-prefill matrix and host-consumer smoke tests. |
| Production persistence and deployment | Existing EHR Docker and service scripts are available; local server serves the page. | Independent MFE assets, Go BFF/API/workers, migrations, probes, secrets, rollout, and recovery. | NOT IMPLEMENTED | No communication Go modules, migration, Kubernetes manifests, provider secrets, or CI workflow. | P0 | `scripts/`, EHR container/deployment files | Build, migration, container, health, rollout, rollback, and recovery tests. |
| Automated quality gates | EHR has Vitest/Playwright scripts; standalone MFE asset build emits but TS/lint/test are incomplete. | Unit, API, component, FHIR, integration, E2E, visual, accessibility, concurrency, and failure coverage. | PARTIAL | MFE TypeScript failure and no communication-specific EHR visual suite; unrelated EHR TS errors remain. | P0 | `ehr/tests/e2e`, `ehr/src/__tests__`, `communication-mfe` | Full HLD/LLD matrix with ownership-triaged failures. |

## Zoom verification

Browser checks at 1440x900 used page-level zoom factors `0.80`, `0.90`, `1.00`, `1.10`, and `1.25`. Each reported `scrollWidth === clientWidth === 1440`; no horizontal overflow was observed. This is a layout smoke check, not a substitute for OS/browser zoom and 200% accessibility testing.

## Immediate corrective sequence

1. Fix MFE TypeScript, lint, and test gates.
2. Make folder, channel, URL, and selected-conversation reconciliation deterministic.
3. Render genuinely email-, call-, voicemail-, and timeline-focused views.
4. Add stable semantic test IDs and accessible form relationships.
5. Wire canonical tasks and audit actions.
6. Add Go BFF/REST contracts, migrations, outbox/inbox, and provider interfaces.
7. Add FHIR mapper and validation fixtures, then run Alex/Morgan review gates.
8. Add host integrations and deployment/CI artifacts; verify with the existing Roshi process.

## 2026-09-13 local hardening evidence

**Scope:** Active Next.js Communication Hub at `http://localhost:3000/communication?asUser=dev`. This is a local development seam using synthetic data, not a remote clinical release.

- The explicit non-production `asUser=dev` alias now resolves consistently to the seeded `dev-doctor` / Dr. Maya Chen identity at page and API boundaries. The active and dormant communication views no longer carry a `noauth` bypass or fabricate an authenticated clinician.
- The hub preserves the preview query for draft saves, exposes draft-save errors, locks a composer to its intended conversation, reconciles filtered selection, and gives Video a clear provider-unavailable destination.
- A server-side pending-attachment registry issues temporary, actor- and patient-bound, single-use metadata IDs. The value `available` means only that the local metadata policy permitted issuance; it does **not** claim binary upload, hashing, malware scanning, or provider delivery.
- v1 commands accept attachment IDs only, retain correlation/idempotency handling, require explicit recipient selection where a reply or call would otherwise be ambiguous, and reject forged, foreign, expired, reused, or patient-mismatched IDs before a message is written.
- Messages record local acceptance and queued provider-free delivery only. Email, telephony, video, and external secure-messaging delivery remain visibly unconfigured. Internal notes have no recipient or delivery attempt. Client retries retain their idempotency keys so an ambiguous response is safely replayable.
- Conversation reads/mutations and SSE event delivery are restricted to conversation participants in the local seam. This is not a replacement for tenant, care-team, consent, or production authorization policy.

### Verification evidence

- `npx.cmd eslint src/app/communication/UnifiedCommunicationHub.tsx src/app/communication/communicationPageData.ts src/app/communication/CommunicationWorkspace.tsx src/lib/clinicalCommunicationStore.ts src/__tests__/clinicalCommunicationStore.test.ts tests/e2e/communication-hub.spec.ts` — passed.
- `npx.cmd vitest run src/__tests__/clinicalCommunicationStore.test.ts` — 9/9 passed.
- `npx.cmd playwright test tests/e2e/communication-hub.spec.ts --workers=1 --timeout=60000 --reporter=line` — 6/6 passed, including canonical preview identity, draft success/failure, selection reconciliation, forged attachment rejection, retry-key reuse, and internal-note behavior.
- `npm.cmd --prefix ehr run build` — passed on 2026-09-13. Existing Next/Turbopack configuration and broad filesystem-tracing warnings remain; the Communication Hub and all v1 routes were built.
- `npm.cmd --prefix ehr run test:unit` — 190/191 passed. The one unrelated failure is `src/__tests__/healthRecords.test.ts`, whose stale expected Quick View allergies/open-work values do not match the current health-record fixture.
- `npm.cmd --prefix ehr run lint` — still fails on 915 existing errors and 365 warnings, primarily generated `ehr/.build` artifacts and unrelated legacy source. The focused communication lint listed above is clean.

### Release disposition and unchanged prerequisites

**Local development verification is complete. Remote deployment was not performed.** The repository contains local Docker/dev scripts but no communication deployment target, reviewed CI/CD workflow, environment manifests, secret configuration, or remote credentials. Do not infer a remote release from the successful local build.

The following remain production-release blockers and require separately approved design/configuration work:

1. Durable database, object storage, content upload/hash/malware/DLP scanning, retention, and recovery.
2. Tenant, organization, care-team, proxy, patient-consent, recipient, and channel policy enforcement.
3. Immutable audit-service integration and canonical task-service synchronization.
4. Approved email, secure-messaging, telephony, and video providers with OAuth/secrets, delivery webhooks, reconciliation, and a durable outbox/inbox worker.
5. A deployed BFF/service boundary, migrations, health/readiness probes, monitoring, rollback, remote smoke tests, and a reviewed deployment pipeline.

## 2026-09-14 architecture-alignment review

The canonical PRD, HLD, LLD, and delivery backlog now distinguish the active EHR-local implementation from the target production architecture. The current hub is implemented in `ehr/src/app/communication/` and `/api/communication/v1`, using `clinicalCommunicationStore.ts` JSON development state, `communicationBff.ts` helpers, participant-filtered in-process SSE, and explicitly unavailable email/telephony providers. `communication-mfe` emits a remote but is not consumed by the EHR.

The shared FHIR runtime is a custom Go FHIR R4 service, not the HAPI JPA deployment described by high-level project context. It exposes generic CRUD/search/history and advertises `Communication`, but no communication route invokes a FHIR mapper. It does not currently provide the complete Communication-domain profile/terminology/message-Bundle capability required for an Ontario or partner exchange; its Ontario validator does not validate `Communication`, and metadata retention/search behavior needs conformance hardening.

The revised target places the future mapper under the communication domain and keeps operational delivery state outside FHIR. `Communication.status` must not represent queued, retrying, delivered, read, acknowledgement, call, voicemail, or endpoint-health state. Ontario/program IG, profile, terminology-server, identifier, transport/security, and display-language decisions remain P0 production gates, requiring Morgan terminology handoff and Alex FHIR approval.

### Baseline evidence observed during review

- `npm.cmd --prefix ehr run test:unit` on 2026-09-14: 197 of 199 tests passed. `healthRecords.test.ts` has stale expected allergies/open-work values. `messageStore.test.ts` observed an `EPERM` JSON-file rename collision; this review did not establish its root cause.
- `npm.cmd --prefix ehr run lint` on 2026-09-14: 915 errors and 365 warnings across the repository, principally unrelated existing sources and generated artifacts. This is not a communication production-release signal.
- The 2026-09-13 focused communication lint, Vitest, Playwright, and EHR build evidence remains the relevant local hub verification described above.

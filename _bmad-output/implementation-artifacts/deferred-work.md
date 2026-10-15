# Deferred production work — Roshi Communication Hub

Reviewed during implementation of `spec-roshi-communication-hub-hardening.md`.

## Provider and data-plane prerequisites

- Replace the local file-backed development store with approved durable, tenant-isolated persistence, migrations, backup/restore, and retention controls.
- Implement actual attachment byte upload, immutable content hashing, malware/DLP scanning, quarantine, download authorization, and retention/deletion workflows. The current seam deliberately records local metadata only and does not claim uploaded bytes or scan coverage.
- Integrate approved secure-message, email, telephony, video, and task providers with OAuth/secret management, outbox/retry workers, provider receipts, and reconciliation. Until then, Roshi records local acceptance and queued/deferred delivery only.

## Clinical governance and deployment prerequisites

- Establish tenant, consent, care-team, and role policy for participant visibility. Internal notes currently use the conservative author-only local projection; a governed care-team policy is required before broader visibility.
- Integrate immutable audit trails and the canonical Tasks service; current local task and event records are explicitly development seams.
- Provision an approved deployment target, environment-specific configuration/secrets, health checks, migrations, CI/CD, monitoring, alerting, and rollback plan. No remote deployment target or credentials were provided for this implementation.

## Real-time patient communication production gate

The requested real calling and messaging capability is a new production system, not an extension of the local development seam. It must not be represented as available until all of the following are implemented and independently verified:

- Persist conversations, participants, messages, deliveries, call sessions, notifications, attachments, clinical links, and audit events in the approved PostgreSQL data plane. Every record and query must enforce tenant, organization, patient, conversation, and participant authorization using canonical IDs—not display names.
- Add database migrations, transactionally committed outbox events, idempotent delivery workers, retry/backoff, dead-letter handling, backups, retention, and audited recovery. A realtime event may publish only after its message or call state is committed.
- Provide authenticated signalling, short-lived call-specific credentials, WebRTC media negotiation, approved STUN/TURN with relay redundancy, reconnect/ICE-restart handling, truthful call state transitions, and explicit safe failure reasons. No browser UI may claim ringing, connection, or delivery without provider evidence.
- Provision authenticated WebSocket fan-out and privacy-safe web push with persisted device subscriptions and offline notification jobs. Subscription authorization must be server-issued and opaque; patient or conversation IDs alone must never grant channel access.
- Enforce server-side AI/RAG filters before retrieval using tenant, organization, patient, conversation, user, and explicitly authorized-resource IDs. AI context, embeddings, notifications, attachments, calls, and search must use the same isolation boundary.
- Define care-team, consent, participant-addition/removal, patient-sharing prohibition, recording, monitoring, and incident-response policies; record each access and state-changing action in the approved audit service.

Required external configuration before implementation or release: an approved PostgreSQL environment and migration owner, tenant/organization authorization policy, authenticated realtime/signalling service, TURN provider, push credentials, secret-management path, observability/alerting destination, deployment target, and rollback authority.

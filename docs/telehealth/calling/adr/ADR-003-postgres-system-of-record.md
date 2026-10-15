# ADR-003: PostgreSQL as the Calling Control-Plane System of Record

**Status:** Proposed and gated.

## Context

The current call data is held in a JSON file by `clinicalCommunicationStore` within one EHR process. That seam has no migration, transaction, tenant partitioning, distributed concurrency, durable outbox, or restart-safe calling history. Prisma declares EHR clinical entities, while the custom Go FHIR service is a separate interoperability runtime.

## Decision

Use an approved PostgreSQL data plane for durable operational calling state: CallSession, CallParticipant, state history, idempotency, consent references, waiting-room records, quality summaries, device registrations, and outbox events. Call mutations and their outbox events must commit atomically. Every query must enforce tenant/organization and server-side authorization.

CallSession remains an operational aggregate separate from Encounter and from FHIR resource persistence. Provider room IDs are secondary opaque mappings, never primary clinical identifiers.

## Alternatives

- Continue JSON persistence: rejected for any durable or multi-instance calling claim.
- Use Redis as clinical truth: rejected; it is only suitable for ephemeral coordination/cache/rate-limiting roles.
- Use LiveKit room state as call truth: rejected; it cannot represent authorization, consent, audit, and clinical workflow.
- Put calling workflow state in the FHIR repository: rejected; FHIR projection is gated and is not the calling control plane.

## Consequences

- A new repository/service boundary, migrations, transaction tests, backup/restore evidence, and approved retention/encryption policy are required.
- Existing canonical Patient, Practitioner, Encounter, Consent, AuditEvent, and task ownership must be referenced rather than duplicated.
- List/history reads can degrade independently from media creation.

## Risks

Actual PostgreSQL version, HA/PgBouncer topology, backup/PITR policy, tenant model, migration owner, and canonical Appointment/Organization sources are unverified.

## Rollback and replaceability

Use reversible migrations where existing conventions permit, application-level interfaces, and a compatibility facade. Do not remove the local seam or migrate fixtures as production data until migration, rollback, restore, and contract tests are approved.

# ADR-005: Transactional Outbox and Existing-Platform Event Backbone

**Status:** Proposed and gated.

## Context

Call creation, ringing, timeout handling, push delivery, provider-event normalization, and operations need asynchronous work without losing committed clinical-control-plane events. The repository has no communication outbox worker or confirmed shared event bus.

## Decision

Write a versioned outbox event in the same PostgreSQL transaction as each durable calling change. An idempotent publisher reads, locks, publishes, retries transient failures, and dead-letters persistent failures while preserving event identity. Select the existing approved event backbone if one exists; otherwise evaluate NATS JetStream or the existing Kafka platform before provisioning either.

## Alternatives

- Publish before database commit: rejected; patients could be notified for calls that do not exist.
- Couple synchronous provider notification to every API write: rejected; provider outage must not roll back durable history.
- Redis pub/sub as durable event store: rejected.

## Consequences

- Ringing, timers, and provider side effects begin only after commit.
- Consumers need processed-event/idempotency protection and operational dead-letter visibility.
- An event-bus outage leaves committed records and pending outbox events for retry; it must not lose or corrupt CallSessions.

## Risks

Existing event-platform ownership, retention, throughput, encryption, access controls, and disaster-recovery behavior are not verified. A workflow scheduler for missed-call timing is also unselected.

## Rollback and replaceability

The database outbox is the stable source of publish intent. The publisher and transport adapter can be paused, replayed, or replaced without rewriting call history. Do not introduce a second bus without documenting why the approved platform cannot meet the need.

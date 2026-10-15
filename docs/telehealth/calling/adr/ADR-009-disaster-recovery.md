# ADR-009: Evidence-Based Calling Resilience and Disaster Recovery

**Status:** Proposed and gated.

## Context

The repository has no deployed calling control plane, LiveKit cluster, TURN fleet, event bus, production Redis topology, backup/PITR evidence, or approved RPO/RTO. The local JSON store cannot support disaster-recovery claims.

## Decision

Define resilience separately for control-plane history and live media:

- Durable CallSession/outbox/audit data uses the approved PostgreSQL HA, backup, PITR, restore, and monitoring strategy.
- Media uses multiple selected-provider nodes and TURN endpoints across appropriate failure domains only after topology and test evidence exist.
- Recovery replays outbox events and reconciles pending work. Active media sessions may require reconnect; seamless active-call migration is not promised.

Health reports must expose individual dependency state rather than represent a media outage as a global history outage.

## Alternatives

- Claim HA/DR from local containers or untested replicas: rejected.
- Add a second SFU immediately: deferred until a business requirement and verified failover design exist.
- Treat provider availability as durable-call availability: rejected.

## Consequences

- Deployments require media-node draining, restore exercises, incident runbooks, alerts, and documented recovery evidence.
- Failure tests include database, Redis/event bus, LiveKit, TURN, realtime layer, packet loss, and regional/provider scenarios where applicable.

## Risks

No approved RPO/RTO, cloud region, capacity target, operational owner, on-call process, or financial resilience commitment exists. A technical design cannot create those business commitments.

## Rollback and replaceability

Keep provider and infrastructure topology configuration external. In an incident, stop new media creation if needed while preserving authorized history and reconciliation. Do not declare production-ready DR until a restore and relevant failure tests have documented results.

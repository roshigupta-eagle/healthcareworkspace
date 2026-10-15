# Runbook: Media Provider / LiveKit Down

**Applies when:** a selected media provider is deployed and health evidence indicates degraded/down service.
**Current local state:** no media provider is configured; local `TELEPHONY_UNAVAILABLE` is expected behavior, not this incident.

## Immediate safety objective

Protect clinical workflow truth. Do not label a call ringing, connected, or recovered unless verified media evidence supports it. Provider-independent call history and committed control-plane records must remain available where the calling store is healthy.

## Triage

1. Record incident time, environment, correlation/trace IDs, opaque call IDs, affected region/provider endpoint, symptoms, and whether the impact is new media, active media, history reads, or realtime delivery.
2. Check calling `/liveness`, `/readiness`, and dependency-health endpoints once implemented. Distinguish database/store from media, realtime, TURN, and event-bus states.
3. Check selected-provider status, node/region health, recent configuration/credential/certificate changes, rate limits, DNS/network reachability, and webhook delivery. Never expose signing keys/tokens in diagnostics.
4. Determine whether active calls have media evidence. Do not promise seamless migration; document observed reconnect/failure behavior.
5. Confirm `GET` call history remains readable. If it does not, open a separate control-plane/store incident.

## Mitigation

- Feature-flag or circuit-break new media creation when the provider is unavailable; return a controlled PHI-safe unavailable response with a correlation ID.
- Preserve committed CallSessions/outbox events and allow the approved retry/recovery mechanism to operate within policy.
- Show patients plain language such as “We’re having trouble connecting the call.” Clinicians may receive approved alternate-workflow guidance.
- Use only approved clinical alternatives and escalation processes; do not route sensitive care through an unapproved channel.
- Coordinate provider/platform/network owners for recovery. Do not rotate credentials, redeploy media nodes, or alter firewall policy without their authorized procedure.

## Recovery validation

1. Confirm provider health from the approved source and that new media creation is restored.
2. Run an approved synthetic/two-browser test with non-production identities where possible.
3. Verify signed webhooks/event normalization, state transitions, history availability, dashboards, and alerts.
4. Reconcile pending outbox work/idempotent events without duplicating notifications or state changes.
5. Record outage duration, affected functions, active-call behavior, recovery duration, alerts, root cause, and corrective actions.

## Escalation evidence

Attach only safe diagnostics: time window, environment, dependency health, opaque IDs, error codes, trace IDs, provider status, configuration version, and sanitized logs. Required owners and escalation paths are currently unassigned.

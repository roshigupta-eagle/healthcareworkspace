# ADR-004: Versioned, Authorized Realtime Calling Events

**Status:** Proposed and gated.

## Context

Incoming ringing, cancellation, participant changes, and answered-on-another-device notifications require timely client delivery. The current SSE stream is process-local and participant-filtered, but has no durable replay cursor or multi-process fan-out.

## Decision

Publish minimal, versioned application-event envelopes after the durable CallSession transaction commits. Authorize server-issued subscriptions to opaque channels. Event consumers must tolerate duplication, reordering, and loss by re-reading Roshi's authorized call state.

An envelope may contain an event ID, versioned type, occurrence time, opaque CallSession ID, and minimum necessary data. It must not carry PHI or confer access simply through knowledge of a patient or call identifier.

## Alternatives

- Use the current in-process SSE stream as production delivery: rejected.
- Put clinical state directly in a Redis/WebSocket payload: rejected.
- Use provider media events as the only application notification source: rejected; provider events do not replace durable clinical authorization and state.

## Consequences

- The outbox/publisher path precedes production ringing.
- Device registration and push-delivery evidence are separate from CallSession state.
- A realtime outage may make ringing stale or delayed, but must not erase a committed call or make history unavailable.

## Risks

No approved realtime platform, push provider, retention policy, mobile client, or fan-out SLO has been selected. Event payload schema, audience and privacy review are prerequisites.

## Rollback and replaceability

Keep the event contract versioned and provider-neutral. Clients fall back to polling/re-read of authorized REST state; an existing or future realtime implementation can be changed without changing the durable state model.

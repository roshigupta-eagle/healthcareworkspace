# Telehealth Call Control-Plane Contract v1

**Status:** implementation boundary; no EHR-to-Go runtime connector is enabled.
**Owner:** calling control plane.
**FHIR posture:** operational domain contract only; it does not define a FHIR mapping.

## Canonical lifecycle vocabulary

The Go calling-control-plane module owns the canonical, versioned call lifecycle. Its `telehealth.call.lifecycle.v1` state is exactly:

```text
CREATED
RINGING
ACCEPTED
CONNECTING
ACTIVE
RECONNECTING
COMPLETED
DECLINED
MISSED
CANCELLED
FAILED
```

The permitted transitions are:

```text
CREATED      -> RINGING | CANCELLED | FAILED
RINGING      -> ACCEPTED | DECLINED | MISSED | CANCELLED
ACCEPTED     -> CONNECTING | CANCELLED | FAILED
CONNECTING   -> ACTIVE | FAILED
ACTIVE       -> RECONNECTING | COMPLETED | FAILED
RECONNECTING -> ACTIVE | COMPLETED | FAILED
```

`COMPLETED`, `DECLINED`, `MISSED`, `CANCELLED`, and `FAILED` are terminal. Administrative correction, if ever introduced, must use a separately authorized and auditable correction event; it is not a normal state transition.

## Current EHR facade boundary

The EHR Communication Hub currently exposes a local development facade with a JSON-backed store. Its richer display/workflow vocabulary includes values such as `waiting_room`, `dialing`, `connected`, `on_hold`, `transferring`, `conferencing`, `ending`, `ended`, `busy`, `no_answer`, and `dropped`. It is not connected to the Go module, does not establish media, and must not be treated as the canonical lifecycle source.

This distinction is intentional until an adapter passes the integration gates below. A direct assignment such as `ACTIVE -> connected` or `COMPLETED -> ended` is not sufficient because the local vocabulary carries UI/workflow detail that the canonical state does not, while canonical `ACCEPTED` has no lossless current-facade equivalent.

## Required adapter shape

Any future connector must carry both facts rather than replace one with the other:

```json
{
  "schemaVersion": "telehealth.call.lifecycle.v1",
  "callSessionId": "opaque-call-id",
  "organizationId": "opaque-org-id",
  "patientContextId": "opaque-patient-id-or-null",
  "controlPlaneState": "ACTIVE",
  "workflowState": "connected",
  "workflowPhase": "on_hold",
  "occurredAt": "RFC-3339 timestamp",
  "revision": 42,
  "correlationId": "opaque-correlation-id"
}
```

- `controlPlaneState` is mandatory and always uses the canonical uppercase enum.
- `workflowState` and `workflowPhase` are optional UI/workflow projections; neither changes the canonical lifecycle.
- `revision` is monotonically increasing per CallSession. Consumers reject duplicate/stale revisions and preserve the immutable history event.
- Identifiers, provider room names, and audit correlation data remain opaque. The event contains no names, MRNs, diagnoses, tokens, SDP, ICE candidates, or recording/transcript content.
- The adapter is scoped to organization and authorized patient/participant context before either read or write. Authorization is rechecked server-side; a browser query parameter is not scope proof.

## Explicit local-facade projection rules

The following projection is allowed only for an approved adapter and always alongside `controlPlaneState`:

| Current facade/workflow detail | Canonical state carried with it | Rule |
|---|---|---|
| `created` | `CREATED` | Direct lifecycle display. |
| `waiting_room` | `CREATED` or `ACCEPTED` | Preserve `waiting_room` as workflow detail; do not infer acceptance from admission alone. |
| `dialing` or `ringing` | `RINGING` | `dialing` remains a local presentation phase. |
| `connecting` | `CONNECTING` | Direct lifecycle display. |
| `connected` | `ACTIVE` | `connected` is a local rendering, not a stored canonical replacement. |
| `reconnecting` | `RECONNECTING` | Direct lifecycle display. |
| `on_hold`, `transferring`, `conferencing`, or `ending` | `ACTIVE` | Preserve detail in `workflowPhase`; retain `ACTIVE` until a durable terminal transition. |
| `ended` | `COMPLETED` | Terminal projection only after the control plane records completion. |
| `busy` or `no_answer` | `MISSED` | Preserve the user-facing disposition separately when policy requires it. |
| `declined` | `DECLINED` | Direct terminal projection. |
| `cancelled` | `CANCELLED` | Direct terminal projection. |
| `failed` or `dropped` | `FAILED` | Preserve technical disposition/error code separately and redacted. |
| canonical `ACCEPTED` with no local equivalent | `ACCEPTED` | Do not coerce it. Extend the facade or show a neutral accepted status before enabling the connector. |

## Integration gates

Before the EHR facade can consume or write this contract, demonstrate all of the following:

1. A PostgreSQL-backed control-plane repository, authenticated handlers, scoped read/write policy, and durable outbox worker are active in the target environment.
2. Provider operations are idempotent by CallSession ID, persistence races reconcile provider bindings, and failed compensations are observable without PHI leakage.
3. Contract tests cover every transition, terminal immutability, repeated delivery, stale revision, answer race, cross-organization/cross-patient denial, and the table above.
4. Realtime delivery is authorized per CallSession and a disconnected client reconciles from the control-plane history endpoint rather than trusting a browser-only event.
5. Privacy, audit, retention, accessibility, device-preflight, clinical safety, and rollout gates in the calling documentation are signed off.

The current provider-free local facade may display recorded failures and perform a permission-only device check. It may not assert a canonical `ACTIVE` call, fabricate provider success, or become the source of truth for a production integration.

## FHIR boundary

This contract is not a FHIR resource, code system, ValueSet, or mapping. `CallSession` remains operational. Do not map these technical states to `Communication.status`; use the governed handoff in [FHIR and terminology handoff](fhir-terminology-handoff.md) only after a named Ontario/program or partner IG, profile, terminology, consent, and privacy approvals are in place.

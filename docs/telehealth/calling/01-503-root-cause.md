# Calling 503 Root-Cause Record

**Recorded:** 2026-09-20
**Environment tested:** local Next.js development server at `http://localhost:3000`
**Actor:** explicitly allowed development-preview actor (`asUser=dev`)
**Scope:** current local Communication Hub only; this is not production-provider or infrastructure evidence.

## Symptom

An attempt to start a call from the local Communication Hub receives a controlled `503` response. Separately, the requested call-history endpoint is absent from the current route surface.

## Reproduction evidence

| Request | Verified result | Interpretation |
|---|---|---|
| `GET /api/communication/v1/calls?asUser=dev` | `405 Method Not Allowed` | The current Next.js calls route exports only `POST`; no history `GET` exists yet. This is a missing capability, not the provider-unavailable 503. |
| Safe replay of a valid prior `POST /api/communication/v1/calls?asUser=dev` with the same accepted body and idempotency key | `503`, `application/problem+json`, `code: TELEPHONY_UNAVAILABLE`, `retryable: true` | The expected local error path was reproduced. The persisted store checksum did not change, demonstrating idempotent replay for that command. |

The returned detail was: “No approved telephony provider is configured. The local call attempt was recorded.” No real patient data, provider credential, media transport, or external infrastructure was used in this verification.

## First failing dependency

The first failing dependency is the deliberately unconfigured **telephony/media provider boundary**, not LiveKit, PostgreSQL, Redis, TURN, an event bus, or an API gateway.

Source inspection confirms the local flow:

```text
POST /api/communication/v1/calls
  -> getCommunicationAccess()
  -> startCommunicationCall()
  -> local JSON store write
  -> provider: not-configured
  -> state: failed
  -> errorCode: TELEPHONY_UNAVAILABLE
  -> 503 application/problem+json
```

`ehr/src/lib/communicationProviders.ts` provides an unavailable provider status by design. `ehr/src/lib/clinicalCommunicationStore.ts` creates the failed local record and event. The calls route does not import or invoke a LiveKit SDK, Twilio, WebRTC provider, Redis, TURN service, NATS/Kafka, Centrifugo, or a standalone Go service.

## Why the 503 occurs

The current local product truthfully refuses to imply that a call rings or connects when no approved external provider exists. It retains a local, auditable failed-attempt fixture and returns an explicit retryable problem response. This matches the existing Communication HLD/LLD/current-state audit, which state that LiveKit, TURN, PSTN/SIP, recording, transcription, and provider webhooks are not configured.

This is intentionally different from a dependency outage. The current implementation has no configured media dependency to health-check or recover.

## Affected behavior

- A clinician cannot establish a real call, ring a patient, issue media credentials, join WebRTC media, or receive provider events.
- The hub can show a local failed call event and provider-unavailable messaging.
- The API lacks a provider-independent `GET /api/communication/v1/calls` history capability.
- `GET /api/communication/v1/inbox?asUser=dev&folder=calls` returned two conversations in local verification, but adding `channel=call` returned zero because conversation summaries currently derive channel classification from messages rather than call records. This is a call-list presentation defect, separate from the 503.

## Required fix path

1. Add an authorized, provider-independent call-history read model behind the stable v1 facade. It must read durable/control-plane state only and remain available if a media or realtime provider is unavailable.
2. Replace the local direct-to-failed fixture behavior only after a transition-validated CallSession model, state history, idempotency, audit, authorization, and durable persistence strategy exist.
3. Introduce a media-provider abstraction with an explicit health/error boundary. A future `MEDIA_PROVIDER_UNAVAILABLE` response can be introduced only through a documented compatibility/error-contract decision; it must never be returned as a fake successful call.
4. Provision and verify LiveKit, TURN, realtime delivery, secrets, network paths, webhooks, and browser media only in the later approved phases. Do not treat their absence in this local seam as a production outage.

## Required regression coverage

| Test | Expected result |
|---|---|
| Authorized call-history list | Returns only authorized records; invokes no media/realtime provider. |
| Unauthenticated/foreign tenant or patient request | Is denied without exposing existence or metadata. |
| Same idempotency key + same start-call intent | Returns the original deterministic result and creates no second CallSession/event. |
| Same idempotency key + different intent | Deterministic conflict; no unintended write. |
| Provider not configured | Controlled `503` problem response; durable intent is retained only when safe; UI never shows ringing/connected. |
| Media provider unavailable after durable core exists | History remains available; media-creating action returns a documented retryable problem and correlation ID. |
| Store unavailable | Controlled `CALL_STORE_UNAVAILABLE` response, not a generic exception or a false empty history. |
| Call-filtered list | Includes call-centric records correctly instead of inferring the channel only from message activity. |

## Remaining unverified evidence

- Production request path, gateway behavior, headers other than the local problem contract, correlation-ID propagation, service logs, database connectivity, and deployment topology.
- Any LiveKit/TURN/realtime/push dependency health, because none is configured or called by this path.
- Root cause of any `503` that occurs after a provider is selected or in another environment. That incident requires a fresh trace containing request, response, correlation ID, service logs, dependency health, and configuration provenance.

## Safety rule

Do not suppress or rewrite this response into a successful local media state. The correct user-facing copy is a plain explanation that calling is unavailable, while operational details remain correlation-ID-linked and PHI-safe.

# ADR-001: LiveKit as the Candidate Media Engine

**Status:** Proposed and gated; no provider is configured or approved in the current environment.

## Context

The active Communication Hub has no real media path and deliberately returns `TELEPHONY_UNAVAILABLE`. The platform needs WebRTC audio, video, screen sharing, bandwidth adaptation, and media participant events without making a vendor the clinical source of truth.

## Decision

Treat LiveKit as the target candidate SFU/media engine only after provider, privacy, security, network, operational, and deployment approvals. Roshi remains the telehealth control plane and owns CallSession, participants, authorization, consent, clinical links, audit, and history. LiveKit owns WebRTC/RTP, tracks, subscriptions, and transport.

All LiveKit SDK use must be isolated behind the calling media-provider interface. Room names and participant identities must be opaque; server-side code alone creates short-lived scoped tokens and validates signed webhooks. A token or room creation is not evidence that a call is ACTIVE.

## Alternatives

- Keep the current provider-free fixture: acceptable only for local development, not telehealth.
- Use a managed or self-hosted alternative SFU: evaluate under the same isolation, security, residency, support, and operational criteria.
- Build or operate a custom SFU: rejected absent a demonstrated requirement and operational ownership.

## Consequences

- Browser media uses the approved provider's WebRTC SDK, while browser control commands remain Roshi APIs.
- A provider integration, signed webhook endpoint, secrets, health checks, and real browser media tests become required work.
- LiveKit unavailability may block new media creation but must not block call history or corrupt durable CallSessions.

## Risks

- No provider account, credentials, region/data-residency decision, LiveKit topology, or network proof is available.
- A provider event can be delayed, duplicated, or forged; domain state needs idempotent normalization and signature verification.
- Active-call failover is not assumed seamless.

## Rollback and replaceability

Feature-flag the provider integration. Preserve Roshi CallSession IDs and opaque provider mappings so a provider can be disabled or replaced without changing clinical identity or history. The current truthful provider-unavailable behavior remains the safe fallback until a replacement is verified.

# ADR-007: Provider-Neutral Media Boundary

**Status:** Proposed and gated.

## Context

The current communication code has an unavailable telephony provider interface, while the target calling platform needs media rooms, scoped credentials, participant administration, health, webhook verification, and normalized events. Direct provider imports in domain code would make clinical state vendor-shaped and hard to replace.

## Decision

Define a provider-neutral media interface at the calling application boundary. The domain receives opaque provider-room mappings, scoped connection details, provider health, and normalized evidence; only an adapter imports LiveKit SDK code. Future SIP/PSTN support, if ever approved, is a separate adapter and does not alter CallSession business identity.

The abstraction must support room lifecycle, token issuance, participant moderation/removal, webhook/event normalization, and health checks. It must not allow a provider to authorize a user, decide clinical consent, or become the primary source of call history.

## Alternatives

- Direct LiveKit calls scattered through Next.js/UI/domain code: rejected.
- Reuse the current fixture provider as a media implementation: rejected.
- Implement SIP/PSTN now: explicitly out of scope.

## Consequences

- Provider implementations can be feature-flagged and health-isolated.
- Provider events must be signature-verified, idempotently processed, and mapped to valid domain transitions.
- Token issuance stays server-side with opaque identities and short TTLs.

## Risks

The exact interface contract, provider capabilities, rate limits, webhook semantics, and token policy need implementation and security review. A generic abstraction must not erase material capability differences such as screen sharing or moderation.

## Rollback and replaceability

Disable an adapter through configuration/feature flag and retain historical provider mappings. Replacement adapters map to the same Roshi CallSession/participant identities; no promise is made that active calls migrate seamlessly.

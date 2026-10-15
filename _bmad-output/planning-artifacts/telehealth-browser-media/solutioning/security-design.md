# Security Design — telehealth-browser-media

## Local protections

- Synthetic development actors only; no patient identity appears in LiveKit names, identities, or logs.
- EHR-to-Go service authentication remains server-side.
- Go checks authorized participant membership before minting any token.
- Join token lives in memory, expires after five minutes, and is not placed in a URL or persisted.
- Camera/microphone permissions are user initiated.
- LiveKit failure returns a typed problem and does not affect history.

## Deferred production controls

Signed webhooks, durable PostgreSQL state, token revocation, proxy/caregiver policy, consent, approved secret store, TLS/data residency, TURN verification, rate limiting, observability, and penetration testing are release gates and are not claimed complete.

# ADR-001: Local LiveKit Browser Media Slice

**Status:** Accepted for local development only
**Date:** 2026-09-28

## Context

The repository has a LiveKit room adapter but no browser token broker or meeting client. Mock lifecycle records cannot demonstrate WebRTC.

## Decision

Add a local LiveKit server, Go token issuer, EHR BFF proxy, and `livekit-client` meeting route. Tokens are scoped to one opaque room and identity, expire in five minutes, and are never embedded in a URL. The browser asks for media only after Join.

## Consequences

- A local SFU is a hard prerequisite; absence is a visible unavailable state.
- This introduces no FHIR mapping, recording, transcription, or production operational claim.
- Two local synthetic participants provide the only required local media acceptance evidence.

## Alternatives

- Continue mock simulation: rejected because it cannot verify browser WebRTC.
- Browser signs provider token: rejected because it exposes a signing secret.
- Treat a token as a call activation: rejected because provider evidence or actual browser connection is required.

# Epics — telehealth-browser-media

**Date:** 2026-09-28

## Epic 1: Local Browser Media Proof

| Story | Outcome | Status |
|---|---|---|
| 1.1 | Run official LiveKit Server locally with synthetic-only development credentials. | Complete |
| 1.2 | Create opaque LiveKit rooms through the Go call-control provider adapter. | Complete |
| 1.3 | Issue short-lived, participant-authorized, room-scoped join grants through EHR BFF to Go control plane. | Complete |
| 1.4 | Render clinician and explicit synthetic-guest meeting routes using `livekit-client`. | Complete |
| 1.5 | Verify two local browser participants reach LiveKit connected state. | Complete |
| 1.6 | Verify camera/microphone publication with user consent on a physical local device. | Pending manual validation |

## Epic 2: Production Media Readiness

Deferred. Requires durable database/outbox, signed provider webhooks, production identity and consent policy, TURN/network evidence, security/privacy review, telemetry, operational ownership, and Ontario/FHIR decisions where a clinical projection is proposed.

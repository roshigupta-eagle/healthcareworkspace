# Domain Research — telehealth-browser-media

**Date:** 2026-09-28
**Author:** Winston (technical discovery); local-only scope.

## Domain overview

Browser media is transport, not clinical truth. Roshi authorizes call participation and owns CallSession history; LiveKit owns WebRTC rooms, tracks, and transport. The local slice uses a clinician fixture and a clearly labelled synthetic guest to establish two browser participants.

## Regulatory and clinical boundary

Ontario PHIPA and PIPEDA are production gates, not satisfied by this local build. No recording, transcription, AI, clinical documentation, FHIR projection, real patient identities, or external deployment is enabled.

## Current state

The Go control plane creates opaque LiveKit rooms only in live mode. The EHR can create/synchronize local call records but has no token broker, browser SDK, or meeting route. A mock provider simulates state without media.

## Technical feasibility

LiveKit documents local development mode at `127.0.0.1:7880` using the non-production `devkey`/`secret` pair. Docker is unavailable on this machine, and neither `livekit-server` nor a browser LiveKit SDK is installed. The implementation must fail closed when this server is absent.

## Discovery gate G2

- [x] Control-plane and browser-media boundaries documented.
- [x] Ontario/FHIR posture confirmed: no new FHIR data contract.
- [x] Local runtime prerequisite identified.
- [ ] Local SFU binary installed and two-browser WebRTC evidence captured.

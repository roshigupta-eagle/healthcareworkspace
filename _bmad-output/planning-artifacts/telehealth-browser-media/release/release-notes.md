# Release Notes — telehealth-browser-media

**Version:** local development proof
**Date:** 2026-09-28
**Target application(s):** ehr-hospital, cross-app

## Summary

Adds a real local LiveKit browser meeting path for synthetic development calls. It includes server-only room-scoped token issuance, clinician and synthetic guest meeting routes, and explicit media connection states.

## Changes

### New features

- Local LiveKit Server integration with opaque rooms and five-minute grants.
- Authenticated EHR BFF join endpoint and browser `livekit-client` meeting surface.
- Development-only synthetic guest route for two-tab signaling validation.

### Bug fixes

-

### Breaking changes

-

## FHIR changes

| Resource | Change | Profile | Impact |
|---|---|---|---|

## Migration steps

No migration. Local live mode is explicitly opt-in through `CALL_ALLOW_EPHEMERAL_LIVE=true`; standard live mode still requires PostgreSQL.

## Known issues

- Browser automation cannot approve physical microphone/camera permissions; a human local-device verification remains required.
- No production claim: recording, transcription, screen sharing, FHIR projection, signed webhooks, TURN validation, and durable live-mode persistence are out of scope.

## Rollback procedure

See [runbook.md](runbook.md). Stop the local SFU/control plane/EHR processes and restart in mock or disabled provider mode.

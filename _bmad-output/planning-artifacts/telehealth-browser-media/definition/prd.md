# PRD — telehealth-browser-media

**Status:** Approved for local-only implementation; production explicitly out of scope.
**Date:** 2026-09-28
**Target applications:** EHR, Go communication service

## Goal

Provide a truthful local browser meeting for a synthetic Communication Hub call. The developer can see and control real local camera/microphone publication and connect a second synthetic browser participant through a local LiveKit server.

## Requirements

| ID | Requirement |
|---|---|
| FR-01 | EHR exposes a call-specific meeting route only for an authorized call participant. |
| FR-02 | The Go control plane issues a short-lived token after trusted BFF authentication, call lookup, participant authorization, and opaque identity mapping. |
| FR-03 | Signing keys and service credentials never reach the browser. Tokens never appear in URLs, logs, persisted call records, or error responses. |
| FR-04 | The browser joins the opaque room using the LiveKit client SDK and shows disconnected, connecting, connected, reconnecting, and failed states. |
| FR-05 | User media is requested only after an explicit Join action. Camera and microphone can be toggled and the meeting can be left. |
| FR-06 | A second local synthetic participant can be joined in a separate tab for an actual local media check. |
| FR-07 | When local LiveKit is absent, the meeting page shows a capability-specific unavailable state and preserves call history. |
| FR-08 | Recording, transcription, screen sharing, FHIR projection, and production deployment remain disabled. |

## Acceptance criteria

- Given a configured local LiveKit server and synthetic clinician call, when the clinician selects Join, then the browser connects using a server-minted token and displays real connection state.
- Given a second synthetic participant opens the local guest route, when both grant media permission, then each receives the other participant's published audio/video track.
- Given an invalid, expired, wrong-room, or unauthorized token request, then the service denies it without disclosing call or patient context.
- Given LiveKit is unavailable, when a join token is requested, then the UI receives a structured provider-unavailable error and no false meeting state.
- Given a browser has not selected Join, then no media permission is requested.

## Non-functional requirements

- Synthetic local data only; opaque room and participant identities; no secrets in client code.
- WCAG 2.2 AA controls, keyboard access, status announcements, captions unavailable state, and no color-only connection meaning.
- Token TTL: 5 minutes for local development; no refresh token.
- No FHIR resource, terminology binding, or Ontario IG projection is created; Alex review records this non-impact decision.

## Gate G3 status

[x] Local requirements and acceptance criteria defined.
[x] UX and data boundary defined in companion artifacts.
[x] FHIR review scope is explicitly no-projection.
[ ] Human local-device consent and two-browser acceptance evidence.

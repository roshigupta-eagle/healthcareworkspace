# Intake Form — telehealth-browser-media

**Date:** 2026-09-28
**Submitted by:** Eagle
**Target application(s):** ehr-hospital, cross-app
**Priority:** Must for local developer demonstration; not a production release.

## Problem statement

The Communication Hub can create mock lifecycle records but cannot open a browser media meeting. Developers need a truthful local WebRTC slice to verify the boundary from Roshi call control to an actual LiveKit room without using real patient data, production credentials, recording, or FHIR projection.

## Expected outcome

An authorized development clinician can open a call-specific meeting route, receive a short-lived server-minted token for an opaque LiveKit room, publish camera/microphone after browser consent, and join a second synthetic participant from another local tab. The UI reports real LiveKit connection state and does not claim clinical completion from a token or room alone.

## Stakeholders

| Name | Role | Interest |
|---|---|---|
| Eagle | Product owner | Local demonstration and delivery decision |
| Winston | Architect | Trust boundaries, replaceability, operations |
| Amelia | Backend | Go token issuer and LiveKit lifecycle |
| Jordan | UI developer | Accessible browser meeting experience |
| Alex | FHIR SME | Confirm no FHIR projection is introduced |

## Initial notes

- Ontario-first context; FHIR R4 is unaffected because `CallSession` remains operational.
- Local synthetic identities only; the server binds locally and uses development-only keys.
- Docker is not installed. LiveKit server must be installed locally or supplied via an approved local container runtime.

---

**Gate G1 status:** [x] Passed — classified as a local-only telehealth media feature; EHR + communication control plane are targets; LiveKit server installation is an external local prerequisite.

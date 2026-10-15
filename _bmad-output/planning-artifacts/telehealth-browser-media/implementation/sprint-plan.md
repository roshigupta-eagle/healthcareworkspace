# Sprint Plan — telehealth-browser-media

**Date:** 2026-09-28
**Scope:** Local-only browser media proof; no production release.

| Order | Story | Deliverable | Evidence |
|---|---|---|---|
| 1 | Local SFU | Official LiveKit Server 1.13.7 in dev mode on loopback. | Server listening on `127.0.0.1:7880`. |
| 2 | Token boundary | Go `TokenIssuer`, LiveKit grant implementation, authenticated `/v1/calls/{id}/join`. | Focused Go handler/media/server tests. |
| 3 | EHR integration | Same-origin join BFF and call-specific meeting surface. | Focused ESLint and server-issued grant response. |
| 4 | Browser proof | Clinician and synthetic guest join the same opaque room. | Both browser pages reported connected. |
| 5 | Human device test | Allow microphone/camera on a physical development device. | Pending. |

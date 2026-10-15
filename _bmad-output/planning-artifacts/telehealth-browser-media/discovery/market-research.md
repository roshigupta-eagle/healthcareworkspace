# Technical Options Review — telehealth-browser-media

**Date:** 2026-09-28
**Scope:** local developer media proof, not provider procurement.

| Option | Fit | Decision |
|---|---|---|
| Continue mock lifecycle | Tests control state only; cannot verify WebRTC. | Rejected for this increment. |
| Browser signs provider credentials | Fast but leaks a media signing secret. | Rejected. |
| LiveKit local server + server-minted grants | Matches existing Go adapter, room model, and provider boundary. | Selected. |
| Managed provider/onboarding | Requires privacy, procurement, residency, and operational approvals. | Deferred. |
| Custom SFU | Adds unnecessary operational complexity. | Rejected. |

The selection is local and reversible. It does not select a production vendor or establish data-residency compliance.

# Personas — telehealth-browser-media

**Date:** 2026-09-28
**Scope:** synthetic local development validation only.

| Persona | Role | Context of use | Primary needs | Accessibility profile |
|---|---|---|---|---|
| Development clinician | Authorized host | Starts a synthetic call and joins the local room. | Clear provider state, explicit Join, truthful device state, leave control. | Keyboard controls, visible focus, text status. |
| Synthetic Sarah participant | Local second-tab stand-in | Joins the same room to validate signaling. | Separate identity and room grant without a real patient account. | Same controls and status semantics as host. |

## Journey

1. Host starts a LiveKit-backed synthetic call from Communication Hub.
2. Host opens the call-specific meeting route and explicitly selects Join.
3. Browser requests camera/microphone permission only at that point.
4. Host opens the synthetic participant link in a second local tab.
5. Both pages display actual connection state; media tracks appear only after device permission and publication.
6. Each participant leaves explicitly; no recording or clinical record is created.

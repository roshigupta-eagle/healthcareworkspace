# UX Design — telehealth-browser-media

**Date:** 2026-09-28
**Target application:** EHR

## Meeting route

`/telehealth/calls/{callId}/meeting` is a focused work surface, not a dashboard card. It has a participant grid, connection status, device controls, Join/Leave command, and a visible local-only banner.

## States

| State | Primary action | Required copy |
|---|---|---|
| ready | Join meeting | Local development meeting. Synthetic participants only. |
| joining | Cancel/Leave | Connecting to local media service… |
| connected | Mute, camera, Leave | Connected to local media service. |
| reconnecting | Leave | Reconnecting media transport… |
| unavailable | Back to call history | Local media service is unavailable. Call history is unchanged. |
| permission denied | Retry after permission change | Camera or microphone permission is required to publish local media. |

## Component contract

- `TelehealthMeetingWorkspace`: feature component; owns LiveKit room lifecycle and no clinical calculations.
- `MeetingParticipantTile`: renders remote/local media and an accessible identity label supplied by the server response.
- `MeetingControls`: icon controls with tooltips and text alternatives for join/leave/microphone/camera.
- `useTelehealthMeetingToken`: same-origin API client; no direct credential or provider-secret access.

## Accessibility

- `role=status` announces connection changes.
- Device controls use pressed state, accessible names, visible focus, and keyboard operation.
- Remote video tile has an audio-only fallback label.
- Motion is reduced for connection transitions under `prefers-reduced-motion`.
- The screen is responsive without text overlap at 320px and desktop widths.

## Jordan handoff

Use `livekit-client` only in the meeting feature. Keep token fetching in `ehr/src/lib/telehealthMeetingClient.ts`; the page route fetches no provider secret. Never infer `ACTIVE` from token issuance; UI connection state is media status only.

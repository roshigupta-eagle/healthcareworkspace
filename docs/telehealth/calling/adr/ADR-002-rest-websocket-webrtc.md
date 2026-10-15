# ADR-002: REST Control, Authorized Realtime Notifications, and WebRTC Media

**Status:** Proposed and gated.

## Context

The EHR has a stable same-origin `/api/communication/v1` facade and process-local SSE. The calling platform needs reliable command semantics, background ringing notification, and low-latency media without conflating those transports.

## Decision

- Use versioned REST/HTTP APIs for CallSession commands and reads, preserving the current v1 browser facade while a control-plane API is introduced.
- Use an authorized realtime notification channel only for application events such as incoming call, cancellation, and answered elsewhere. It is not the durable event store or media transport.
- Use WebRTC directly between browser and approved media infrastructure for audio/video/screen sharing. Do not send media over WebSocket.

The current SSE route may remain a local compatibility mechanism, but it is not sufficient as production ringing delivery. Evaluate existing realtime capability before adding Centrifugo or another platform.

## Alternatives

- WebSocket for all control and media: rejected; it does not meet the media boundary and prevents graceful protocol separation.
- Polling-only ringing: insufficient for real incoming call requirements and background devices.
- Direct browser-to-provider control without Roshi APIs: rejected because it bypasses clinical authorization and durable state.

## Consequences

- REST commands require idempotency, authorization, timeout, and deterministic conflict behavior.
- Realtime envelopes require opaque channel IDs, versioning, subscription authorization, and idempotent consumers.
- Browser media must display actual connection state rather than a command acknowledgement.

## Risks

- The existing SSE implementation is in-process and cannot provide multi-instance/replay guarantees.
- Browser and mobile background delivery differs by platform; web push/APNs/FCM selection is unresolved.

## Rollback and replaceability

Keep REST contracts versioned and media-independent. A realtime provider may be exchanged behind an event-publishing boundary; clients can re-read authorized call state after reconnect or notification loss.

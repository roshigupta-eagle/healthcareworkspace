# Telehealth Calling Runbooks

These are target operational procedures. The repository has no deployed calling provider, media cluster, TURN fleet, production event bus, or calling dashboard, so the procedures identify evidence and owners that must exist before production use.

All investigation must use correlation/trace IDs and opaque identifiers. Do not paste patient names, MRNs, diagnoses, room names, credentials, tokens, recordings, transcripts, or full webhook payloads into tickets or generic logs.

- [LiveKit/media provider down](livekit-down.md)
- [TURN failure](turn-failure.md)
- [Calling 503](503.md)
- [High packet loss](high-packet-loss.md)

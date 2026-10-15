# ADR-006: TURN Strategy and Network Traversal Verification

**Status:** Proposed and gated.

## Context

Real telehealth calls must work beyond a trusted local office network. No LiveKit TURN service, Coturn deployment, UDP/TCP/TLS relay configuration, firewall rule, media-node topology, or network test evidence is currently present.

## Decision

Use the selected media provider's supported TURN path as the initial strategy, with short-lived credentials and environment-specific secrets. Verify direct UDP, TURN/UDP, and TURN/TCP or TLS where configured. Introduce dedicated Coturn only if documented requirements justify independent scaling, multi-region relays, relay isolation, or a separate failure domain.

## Alternatives

- Assume direct WebRTC works from local development: rejected.
- Deploy Coturn immediately without a topology requirement: deferred.
- Treat HTTPS/TLS signaling as sufficient media connectivity: rejected.

## Consequences

- TURN configuration, credentials, port ranges, certificate management, bandwidth monitoring, and network ownership become deployment prerequisites.
- TURN use is technical telemetry, not clinical data; store only an appropriate quality summary in the control plane.
- A TURN-only real-call test is mandatory before claiming fallback works.

## Risks

Provider behavior, regional availability, egress/bandwidth cost, hospital firewall policies, mobile/network restrictions, and credential lifecycle are unverified.

## Rollback and replaceability

Keep TURN endpoints/configuration behind provider/environment settings. A bad relay endpoint can be removed or rotated without changing call identity; no current production topology is implied by this ADR.

# Runbook: TURN Failure

**Applies when:** direct WebRTC may work but relay connectivity, relay credentials, or restricted-network calls fail.
**Current local state:** no TURN configuration or real media path exists; this procedure is a production prerequisite.

## Symptoms

- Calls fail only on restricted, mobile, hospital, or enterprise networks.
- Connection attempts remain reconnecting or fail after direct candidates cannot establish media.
- Elevated TURN allocation/authentication errors, relay bandwidth saturation, certificate failures, or unavailable relay endpoints appear in approved telemetry.

## Triage

1. Capture time, environment, opaque call ID, client platform/browser/network class, selected media region, and correlation/trace ID. Do not collect raw ICE candidate details or PHI in a support ticket.
2. Determine whether direct UDP, TURN/UDP, and configured TURN/TCP/TLS paths are affected; use approved synthetic diagnostics only.
3. Check credential issuance/expiry, relay endpoint reachability, DNS, certificate validity, required ports/security groups/firewall rules, node health, CPU/network/bandwidth/session count, and provider/media configuration version.
4. Compare affected region/client network to known healthy paths. Check for an incident in the media provider or network platform.
5. Confirm control-plane history and authorization remain healthy; TURN failure must not mutate or erase CallSession records.

## Mitigation

- Preserve the current call state until trusted media evidence establishes a deterministic reconnect/failure outcome.
- Attempt only approved provider fallback paths; do not tell users that fallback succeeded without a real TURN-only/connection confirmation.
- If a relay is unhealthy, remove it from new allocations through the approved provider/network process and use a separate failure domain if configured.
- Present patient-safe wording and offer only approved alternative clinical workflow. Do not disclose ICE internals.

## Validation before closure

- Direct UDP, TURN/UDP, and configured TURN/TCP/TLS tests pass from approved test networks.
- A forced TURN-only real audio/video test succeeds with synthetic test identities.
- Credential rotation, certificate/port configuration, relay capacity, dashboards, and alerts are verified.
- Incident record explains impact, root cause, corrective actions, recurrence prevention, and any calls that did not recover.

## Escalation

Network/firewall, platform, provider, and clinical-operations owner contacts must be documented before launch. This repository does not establish those contacts or authorize infrastructure changes.

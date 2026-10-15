# Runbook: High Packet Loss or Degraded Call Quality

**Applies when:** real media telemetry and user reports indicate degraded audio/video after a media provider is selected.
**Current local state:** no real media telemetry exists; quality values are future technical summaries only.

## Immediate safety objective

Preserve intelligible audio where possible, avoid false “good connection” indicators, and use an approved clinical alternative if a safe consultation cannot continue. Do not expose raw transport diagnostics to patients.

## Triage sequence

1. Capture time window, environment/region, opaque call ID, client browser/platform, network category if voluntarily available, media/TURN region, correlation/trace ID, and consent-safe quality summary.
2. Review approved technical signals: packet loss, jitter, RTT, bitrate, ICE/connection state, reconnect count, TURN use, media-node CPU/network throughput, relay bandwidth, and regional error rate.
3. Classify likely source without certainty: individual client network, network handover, browser/device, TURN relay, media node, region/ISP path, or provider-wide incident.
4. Compare against synthetic tests and other calls in the same safe aggregation bucket. Metrics labels must remain PHI-safe.
5. Confirm whether the call recovered, fell back to audio, remained reconnecting, or reached a deterministic terminal state. Do not infer clinical quality from transport metrics.

## Mitigation

- Follow the media provider's verified adaptive strategy: lower video quality, then disable video while preserving audio where supported.
- Surface “Connection interrupted. Reconnecting…” and only show recovery after actual media evidence.
- Support device/network switching only after it has been implemented and tested; do not ask users to expose sensitive network details.
- If recovery timeout is reached, offer retry/end and an approved alternate clinical workflow. No endless spinner.

## Evidence required for closure

- Reproduction or test outcome from a controlled degraded-network/packet-loss test.
- Quality-summary and dependency telemetry correlation using opaque identifiers.
- Impact assessment, provider/network findings, actions taken, recovery behavior, and follow-up.
- Verification of audio survival, adaptive video, reconnect and user-facing accessibility/error language where the feature claims them.

## Escalation boundaries

Client-network, TURN, media-provider, regional/ISP, browser, and platform incidents may require different owners. This runbook does not authorize ISP contact, packet capture, media-node change, browser policy override, or infrastructure modification without approved operational procedures.

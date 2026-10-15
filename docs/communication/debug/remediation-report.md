# Communication Hub Error Remediation Report

**Recorded:** 2026-09-27
**Status:** Evidence-based remediation snapshot. This report does not claim real browser media, LiveKit deployment, or production readiness.

## Results

| Original failure | Root cause | Resolution / current behavior | Verified |
|---|---|---|---|
| `POST /api/communication/v1/calls` returned `503` | The active EHR process runs with call provider mode disabled. | The EHR returns a structured `503 CALL_PROVIDER_NOT_CONFIGURED`; call history remains available. Use matching EHR and Go mock/live configuration to initiate control-plane calls. | Yes: `POST` reproduced `503`; `GET /calls` returned `200`. |
| `POST /api/communication/v1/drafts` returned `404` | Not reproducible on the active source/runtime. The route is registered and reachable. | Valid synthetic save returned `200`. No duplicate route or fake success path was introduced. | Yes. |
| `POST /api/communication/v1/conversations/conv-pharmacy` returned `404` | Not reproducible on the active source/runtime. The route is registered and `conv-pharmacy` exists as a development fixture. | Valid synthetic submission to the fixture's authorized pharmacy recipient returned `201`. Unauthorized recipient selection returns truthful `403`. | Yes. |
| `/_next/webpack-hmr` WebSocket failed in browser | Development HMR transport issue, separate from Roshi application realtime and LiveKit. | The server-side upgrade endpoint returned `101 Switching Protocols`. The integrated browser reported `ERR_INVALID_HTTP_RESPONSE`, so an intermediary/browser-environment issue remains. | Partially: server upgrade verified; browser transport still fails. |

## Route and Topology Map

```text
Browser
  -> Next.js /api/communication/v1/drafts
  -> Next.js /api/communication/v1/conversations/{conversationId}
  -> Next.js /api/communication/v1/calls
       -> server-only EHR provider client
       -> Go communication /v1/calls
       -> mock or LiveKit provider adapter
```

- [drafts route](../../../ehr/src/app/api/communication/v1/drafts/route.ts) supports `GET` and `POST`.
- [conversation route](../../../ehr/src/app/api/communication/v1/conversations/[conversationId]/route.ts) supports `GET`, `POST`, and `PATCH`.
- [calls route](../../../ehr/src/app/api/communication/v1/calls/route.ts) supports `GET` and `POST` with typed provider problems.
- [call-provider configuration guidance](../../telehealth/calling/environment-guidance.md) describes disabled, mock, and live modes.

## Concrete Evidence

### Calls

The live EHR process returned:

```json
{
  "status": 503,
  "code": "CALL_PROVIDER_NOT_CONFIGURED",
  "detail": "No approved call provider is configured for this environment.",
  "retryable": false,
  "correlationId": "8199e248-ae4b-4626-8db2-632f45c70e57"
}
```

This is expected in disabled mode and must not be replaced with a fabricated success. An earlier local smoke test verified the Go service in mock mode can create a synthetic call and progress it through its simulated lifecycle. A full EHR-to-Go mock call was not rerun because the user elected not to restart the existing port-3000 EHR dev process; Next.js prevents a second development server for the same application directory.

### Drafts and Messages

The active runtime accepted:

- Draft save: `200`, correlation ID `c9d54cdb-8e4d-45e8-93fe-4304ab4aab96`.
- Message send to `conv-pharmacy`: `201`, correlation ID `68459501-960a-4e48-8069-418aa14146f6`.

The original `404`s therefore do not currently indicate a missing API implementation. They should be investigated from retained server logs only if they recur, with request URL, correlation ID, and response body captured.

### HMR

The browser observed failures for `ws://127.0.0.1:3000/_next/webpack-hmr`, while a direct HTTP upgrade probe received status `101` and `Upgrade: websocket`. This is not Roshi application realtime. It should be debugged by testing the browser/network/proxy boundary, including browser extensions, local proxy/VPN, and the integrated browser's WebSocket behavior. It is not valid evidence of an EHR call-control or LiveKit defect.

## Remaining Work

1. Restart the EHR development process with the mock-mode environment in the configuration guide, then validate an EHR `POST /calls` returns `201` and subsequent sync transitions are visible.
2. Diagnose the integrated browser HMR handshake, because direct upgrade succeeds but the browser reports an invalid response.
3. Implement browser LiveKit join tokens and client media only after infrastructure, consent, authorization, TURN, and operational prerequisites are approved. The current mock/live adapter work is control-plane only.

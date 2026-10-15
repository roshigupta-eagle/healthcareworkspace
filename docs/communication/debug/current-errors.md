# Communication Hub Current Error Reproduction

**Recorded:** 2026-09-27
**Scope:** Current EHR development server at `http://127.0.0.1:3000`, using the explicit development actor query parameter and synthetic fixture data only.

## Request Matrix

| Operation | Request | Observed result | First failing layer | Evidence |
|---|---|---:|---|---|
| Save draft | `POST /api/communication/v1/drafts?asUser=dev` | `200` | None reproduced | Valid synthetic draft saved; correlation ID `c9d54cdb-8e4d-45e8-93fe-4304ab4aab96`. |
| Send message | `POST /api/communication/v1/conversations/conv-pharmacy?asUser=dev` | `201` | None reproduced | Valid synthetic message to authorized `org-maple-pharmacy`; correlation ID `68459501-960a-4e48-8069-418aa14146f6`. |
| Start call | `POST /api/communication/v1/calls?asUser=dev` | `503` | EHR call-provider configuration | `CALL_PROVIDER_NOT_CONFIGURED`, correlation ID `8199e248-ae4b-4626-8db2-632f45c70e57`. |
| Call history | `GET /api/communication/v1/calls?asUser=dev` | `200` | None | History remains readable while call initiation is unavailable. |
| Next.js HMR | `/_next/webpack-hmr` WebSocket | Browser handshake failed; direct upgrade returned `101` | Browser/intermediary development transport, separate from application realtime | The integrated browser reported `ERR_INVALID_HTTP_RESPONSE`; the Next.js process returned `101 Switching Protocols` with `Upgrade: websocket` to a direct probe. |

## Error Details

### Call initiation `503`

The active EHR process is not configured with `CALL_PROVIDER_MODE=mock|live`, `COMMUNICATION_SERVICE_URL`, and `COMMUNICATION_SERVICE_AUTH_TOKEN`. The API returns a structured capability-specific problem instead of faking success:

```json
{
  "status": 503,
  "code": "CALL_PROVIDER_NOT_CONFIGURED",
  "retryable": false,
  "correlationId": "8199e248-ae4b-4626-8db2-632f45c70e57"
}
```

The current control-plane topology is:

```text
Browser -> Next.js /api/communication/v1/calls -> EHR server call client -> Go communication /v1/calls -> configured mock or LiveKit adapter
```

The disabled-mode `503` is expected. Starting the Go mock service alone is insufficient: the existing EHR dev process must be restarted with matching server-only configuration before it will call that service.

### Reported draft and conversation `404`s

Current source contains registered Next.js route handlers for both requests. The live server on port 3000 accepted valid requests with `200` and `201` respectively. Earlier `404` evidence cannot be reproduced against the current runtime. Likely causes include a stale development build/process, a previous route-compilation failure, a malformed request, or a resource-scope error; the recorded evidence does not justify choosing among them.

`conv-pharmacy` is a synthetic local fixture conversation. It must remain development-only and must not become a production authorization identity.

### HMR WebSocket

`/_next/webpack-hmr` is development hot-reload infrastructure. The integrated browser reproduced a WebSocket handshake failure (`ERR_INVALID_HTTP_RESPONSE`), but the same Next.js process returned `101 Switching Protocols` to a direct upgrade probe. This points to the browser or an intermediary boundary, not a missing HMR route and not a LiveKit or Roshi realtime failure. The original `ERR_NETWORK_IO_SUSPENDED` remains a separate suspend/network condition and was not reproduced.

## Safety Notes

- Requests used synthetic IDs and synthetic content only.
- No patient names, clinical content, provider secrets, or token values are recorded here.
- The development actor bypass is not production authentication.

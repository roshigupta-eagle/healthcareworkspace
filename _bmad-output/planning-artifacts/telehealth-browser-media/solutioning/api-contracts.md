# API Contracts — telehealth-browser-media

## Go private control-plane API

`POST /v1/calls/{callId}/join`

Trusted BFF authentication and trusted actor headers are required. The call must exist, have an opaque LiveKit room binding, and include the actor as a participant. Response:

```json
{
  "data": {
    "serverUrl": "ws://127.0.0.1:7880",
    "token": "short-lived-jwt",
    "roomName": "opaque-room-id",
    "identity": "opaque-participant-id",
    "expiresAt": "RFC-3339"
  },
  "meta": { "correlationId": "opaque-id" }
}
```

## EHR browser API

`POST /api/communication/v1/calls/{callId}/join`

Uses the existing BFF actor resolver and forwards the request to Go. It returns the same envelope or a standard problem response. Browser code must not call Go directly.

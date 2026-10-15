# Test Results — telehealth-browser-media

**Date:** 2026-09-28
**Status:** Local media proof passed with device-publishing limitation.

| Check | Result | Evidence |
|---|---|---|
| Go config/media/handler/server tests | Passed | `go test ./internal/config ./internal/media ./internal/handler ./internal/server` |
| Join authorization regression | Passed | Authorized LiveKit call returned a scoped grant; mock call returned `409 MEDIA_JOIN_NOT_AVAILABLE`. |
| EHR meeting file lint | Passed | Focused ESLint on provider helper, BFF route, meeting page/component, Calls workspace. |
| Full EHR typecheck | Blocked outside scope | Existing workspace type errors in dashboard, scheduling, lab comparator, task, and weight modules; new meeting files have no diagnostics. |
| Full EHR unit suite | Blocked outside scope | 209/211 tests passed. Existing health-record fixture mismatch failed; message-store test hit Windows `EPERM` while the active dev server held `secure_messages.json`. |
| Full EHR lint | Blocked outside scope | Existing baseline: 915 errors and 365 warnings. Focused lint for all modified meeting files passed. |
| Local LiveKit room | Passed | EHR created call `e347430f-5583-4bb6-b6e0-858e4aebbd37`, provider `livekit`, opaque room `call-a5843946ac0d7a49aa7c231ab7b5704a`. |
| Browser join grant | Passed | Same-origin EHR BFF returned a five-minute scoped grant with `ws://127.0.0.1:7880`; token was not printed or persisted. |
| Two participant signaling | Passed | Clinician page and `localGuest=true` page both displayed `Connected to local media service`. |
| Published camera/microphone tracks | Pending manual | Automated browser has no permission to access physical devices; UI kept microphone/camera disabled and did not claim tracks. |

No production, PHIPA, FHIR, recording, transcription, TURN, or external deployment claim is made by this evidence.

## Architecture review gates

- **Alex, FHIR SME:** approved. The increment creates no FHIR projection and does not map CallSession or LiveKit connection state to `Communication.status`.
- **Jordan, UI Developer:** approved after `telehealthMeetingProvider.ts` was fenced with `import 'server-only'`; browser code receives only a short-lived scoped grant from the same-origin BFF.
- **Winston, Architect:** approved for the documented local-only proof. Production gates remain open.

**Date:** 2026-09-28

## Summary

| Test type | Passed | Failed | Skipped |
|---|---|---|---|

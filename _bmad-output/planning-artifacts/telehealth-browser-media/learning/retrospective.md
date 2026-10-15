# Local Media Proof Retrospective — telehealth-browser-media

## What worked

- The existing provider-neutral Go adapter made room creation and token issuance a focused extension.
- The EHR BFF kept control-plane credentials and LiveKit signing secrets out of the browser.
- Two browser tabs reached actual LiveKit connected state with opaque identities.

## What was learned

- A browser-media proof requires an actual SFU and cannot be represented by a control-plane mock.
- The local development server must preserve preview context on client API calls.
- Device-publishing evidence requires a human-controlled browser permission boundary; automation must not claim camera/microphone success when it cannot grant permission.

## Follow-up actions

1. Perform a human local-device test with camera and microphone permission in two tabs.
2. Add signed webhook reconciliation and state transitions only with durable persistence.
3. Complete production security, privacy, TURN, accessibility, performance, and operations gates before any release decision.
---
title: 'Harden the provider-free Roshi Communication Hub'
type: 'feature'
created: '2026-09-12'
status: 'in-review'
baseline_commit: '484507c221c960dbddd53bac6faccd14e295176d'
context:
  - '{project-root}/docs/communications/HLD.md'
  - '{project-root}/docs/communications/LLD.md'
  - '{project-root}/docs/communications/CURRENT_STATE_AUDIT.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The active hub misidentifies `?asUser=dev`, silently fails preview draft saves, drops new-conversation attachment metadata, and can retain an unrelated thread after a filter produces no results. Its provider-free local seam also trusts attachment metadata supplied by the browser.

**Approach:** Harden the existing Next.js hub and file-backed BFF seam without replacing current work or pretending unconfigured channels are operational.

## Boundaries & Constraints

**Always:** Preserve existing work; use opaque IDs; validate actor, recipient, patient, and issued safe attachments server-side; keep preview development-only and provider states truthful; distinguish acceptance from delivery/read/acknowledgement; use synthetic data; meet WCAG 2.2 AA; keep FHIR resources and credentials out of client code. Ontario/FHIR R4 remains the default; no profile or terminology binding changes are included.

**Ask First:** Remote deployment, provider/OAuth configuration, credentials or secrets, live email/call/video, migration, FHIR or terminology change, or task/audit contract change.

**Never:** Claim delivery, read, acknowledgement, connection, video, or remote deployment without evidence; accept browser-forged attachment metadata; reset/clean/push this dirty worktree; use an iframe or mock success path; expose PHI, secrets, or production preview bypasses.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected behavior | Error handling |
|---|---|---|---|
| Preview | `?asUser=dev` | Page and APIs resolve to seeded `dev-doctor`; unread/participant logic agrees. | Other actors follow normal authentication. |
| Draft | Preview composer change | Request retains preview context; confirmed save is shown. | Visible recoverable save error; no false claim. |
| Attachment | Issued safe IDs for actor/patient | Server resolves and persists exact metadata. | Reject forged, missing, blocked, foreign, reused, or mismatched IDs. |
| Filter | Current selection is excluded | Select first visible item or display an intentional empty state. | Never retain a stale thread. |
| Provider absent | Email/call/video viewed | Status stays not configured; local records remain truthful. | Never simulate external success. |

</frozen-after-approval>

## Code Map

- `ehr/src/app/communication/UnifiedCommunicationHub.tsx` -- active client state and commands.
- `ehr/src/app/communication/communicationHubPageData.ts`, `ehr/src/lib/doctorWorkspaceAuth.ts` -- preview actor resolution.
- `ehr/src/app/api/communication/v1/`, `ehr/src/lib/clinicalCommunicationStore.ts` -- BFF and attachment trust boundary.
- `ehr/src/__tests__/clinicalCommunicationStore.test.ts`, `ehr/tests/e2e/communication-hub.spec.ts` -- regression coverage.
- `docs/communications/CURRENT_STATE_AUDIT.md` -- evidence and blockers.

## Tasks & Acceptance

**Execution:**
- [x] `doctorWorkspaceAuth.ts`, `communicationHubPageData.ts` -- normalize the allowed `dev` alias to seeded clinician identity at page and API boundaries.
- [x] `UnifiedCommunicationHub.tsx` -- send preview context with autosave, show save failures, reconcile selection on mode/folder/query/snapshot changes, and add a clearly unavailable Video destination.
- [x] `clinicalCommunicationStore.ts` -- persist issued pending attachments and validate owner, safe state, single use, and patient compatibility.
- [x] v1 routes -- accept attachment IDs only and map validation failures to problem details while preserving correlation/idempotency.
- [x] Tests -- cover identity, draft query/error, new/reply attachment acceptance and rejections, and email/voicemail empty selection.
- [x] `CURRENT_STATE_AUDIT.md` -- record local evidence and unchanged provider/remote-release prerequisites.

**Acceptance Criteria:**
- Given `?asUser=dev`, when the page and APIs load, then they use one actor ID and seeded messages are classified correctly.
- Given preview draft editing, when autosave runs, then its request contains preview context and failures are visible.
- Given an issued safe attachment, when it is sent for its patient, then it persists on the canonical message; forged, foreign, blocked, reused, or wrong-patient attachments create no message.
- Given a filter excludes the selected conversation, when the visible list changes, then the thread is in scope or empty.
- Given no provider configuration, when email/call/video is viewed, then the UI is truthful and reports no external success.

## Spec Change Log

## Design Notes

The file-backed store remains a development seam, not a delivery system. A pending-attachment registry establishes the browser-to-server trust boundary and can later be replaced by approved storage/scanning. The client derives selection from the visible set to prevent list/detail disagreement.

## Verification

**Commands:**
- `npm.cmd --prefix ehr exec eslint src/app/communication/UnifiedCommunicationHub.tsx src/lib/clinicalCommunicationStore.ts` -- no errors.
- `npm.cmd --prefix ehr run test:unit -- --run src/__tests__/clinicalCommunicationStore.test.ts` -- focused communication tests pass.
- `npm.cmd --prefix ehr run test:e2e -- communication-hub.spec.ts` -- route, preview, selection, and provider states pass.
- `npm.cmd --prefix ehr run build` -- build completes or isolates a pre-existing unrelated failure.

**Manual checks:**
- Open `http://localhost:3000/communication?asUser=dev`; verify modes, empty state, keyboard/focus behavior, draft status, and provider strips at desktop and narrow widths.
- Localhost is development verification only. Remote release requires an environment, reviewed pipeline/manifests, credentials, and post-deploy health/smoke evidence.

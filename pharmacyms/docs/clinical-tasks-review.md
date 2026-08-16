# Clinical Tasks — Design Review Findings

Date: 2026-08-01

Summary
-------
This document records structured review passes applied to the Clinical Tasks HLD and LLD. Each pass lists findings, recommended changes, and risk rating.

Review Pass 1 — Product completeness
-----------------------------------
Findings:
- HLD/LLD cover all requested doctor workflows and UI patterns.
- UpcomingTasksCard already points to `/dashboard/records/:patientId/tasks` (good).
- No existing page file implements the route yet; must be added.

Risks / Actions:
- Implement missing route and components (Phase 1). Risk: low.

Review Pass 2 — Clinical safety
-------------------------------
Findings:
- PatientBanner and PatientProfileHeader exist and provide safety context.
- HLD mandates server-side patient-access checks and audit writes.

Risks / Actions:
- Ensure API handlers call `requireActor()` and validate patient-ownership before acting.
- Add tests validating blocked actions for users without patient access.
Risk: high if not enforced (PHI leakage).

Review Pass 3 — Workflow correctness
-----------------------------------
Findings:
- State machine aligns with FHIR `Task.status` values.
- Reopening strategy uses creation of a linked new task for safety.

Risks / Actions:
- Ensure server `validateTransition()` prevents invalid transitions and records reason for overrides.
Risk: medium.

Review Pass 4 — FHIR correctness
--------------------------------
Findings:
- `ehr/src/lib/fhir-client.ts` is present and supports reading/writing Task and ServiceRequest resources.
- Decision: do not persist every app task to FHIR by default; only tasks intended for cross-system exchange should map to FHIR Task.

Risks / Actions:
- Clarify policy on which tasks map to FHIR (open question); implement configurable `taskToFhir` flag.
Risk: medium.

Review Pass 5 — Data integrity
------------------------------
Findings:
- Prisma schema currently lacks Task models — LLD proposes `ClinicalTask` and `ClinicalTaskHistory`.

Risks / Actions:
- Migrations required; ensure `relatedId` cross-check and foreign-key constraints where possible.
Risk: medium.

Review Pass 6 — Security
------------------------
Findings:
- Auth patterns (`auth()`, `requireActor()`) exist in `notes` and can be reused.
- P0 issue: EHR middleware includes dev bypasses; LLD requires gating bypasses via env vars (we already patched `ehr/src/middleware.ts`).

Risks / Actions:
- Enforce server-level permission checks in route handlers.
- Audit export actions.
Risk: high if server checks missed.

Review Pass 7 — Auditability
----------------------------
Findings:
- `ehr/src/lib/audit.ts` exists to record `AuditEvent` entries.

Risks / Actions:
- Ensure read operations for sensitive tasks are audited where policy requires.
Risk: medium.

Review Pass 8 — UX and cognitive load
------------------------------------
Findings:
- HLD/LLD propose summary cards and filter patterns consistent with design system.
- Keep the number of quick filters limited on the main toolbar; advanced filters in a drawer.

Risks / Actions:
- Run user testing session for first-phase UI to validate scanability.
Risk: low.

Review Pass 9 — Visual consistency
----------------------------------
Findings:
- Design-system has PatientBanner and primitives to be reused.

Risks / Actions:
- Use Badge, Badge color tokens, and spacing tokens for visual consistency.
Risk: low.

Review Pass 10 — Accessibility
------------------------------
Findings:
- Use accessible components and patterns from `design-system/primitives`.

Risks / Actions:
- Add automated Axe checks and Playwright keyboard tests.
Risk: medium.

Review Pass 11 — Responsive behavior
------------------------------------
Findings:
- LLD outlines desktop/tablet/mobile layout variations.

Risks / Actions:
- Implement responsive breakpoints and thumbs-friendly controls for mobile.
Risk: low.

Review Pass 12 — Performance
----------------------------
Findings:
- LLD recommends virtualization/pagination and lazy-loading for heavy data like FHIR and audit.

Risks / Actions:
- Use cursor-based pagination for APIs expected to return many rows.
Risk: medium.

Review Pass 13 — Error handling
-------------------------------
Findings:
- LLD error model created; must be used consistently across handlers.

Risks / Actions:
- Implement and test 409 conflict flows (opt-concurrency) and show conflict dialog UX.
Risk: medium.

Review Pass 14 — Test completeness
---------------------------------
Findings:
- LLD includes unit/component/integration/e2e strategies.

Risks / Actions:
- Prioritize tests around permission enforcement and state transitions.
Risk: medium.

Review Pass 15 — Implementation readiness
-----------------------------------------
Findings:
- HLD/LLD provide required artifacts for Phase 1 implementation.
- Open questions remain: FHIR mapping policy; export PHI policy; recurrence occurrence expansion strategy.

Risks / Actions:
- Resolve open policy questions with clinical leads/legal before enabling FHIR writes and exports.

Assumptions & Unresolved Decisions
---------------------------------
- Which tasks must be mirrored to the FHIR server? (policy)
- Export PHI content: which fields allowed in CSV/PDF? (legal)
- Recurrence canonicalization vs occurrence-generation (architectural choice).

Conclusions
-----------
- HLD & LLD are ready for Phase 1 implementation (mock-backed UI) pending policy decisions on FHIR and exports.
- Next action: implement route and UI mock components in a development branch; add unit tests and run CI checks.


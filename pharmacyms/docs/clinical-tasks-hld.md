# Clinical Tasks — High Level Design (HLD)

Status: Draft — created by AI-assisted engineering agent
Date: 2026-08-01

Purpose
-------
Clinical Tasks is a patient-scoped clinical work-management workspace for clinicians to coordinate and complete patient-specific work. It is not a generic to-do list: every task contains clinical context (patient, reason, related FHIR resources) and safety controls.

System Boundaries
-----------------
- Frontend: Roshi EHR (Next.js App Router) — patient-scoped UI at `/dashboard/records/:patientId/tasks`.
- Backend: Next.js route handlers under `src/app/api/*` for task CRUD and actions (server-enforced auth & permissions).
- Persistence: PostgreSQL via Prisma (new Task tables added to schema); in-memory mock service for early dev.
- FHIR: `Task` and related resources stored in FHIR server via existing `ehr/src/lib/fhir-client.ts` for interoperability.
- Audit / Provenance: local `AuditEvent` and `Provenance` tables via existing `ehr/src/lib/audit.ts`.
- Notifications: existing notification pipeline (SSE/Redis) for reminders & critical alerts.

Key Users and Personas
----------------------
- Primary: Physician (doctor-facing experience prioritized)
- Other clinical: Nurse, Nurse Practitioner, Physician Assistant, Pharmacist, Lab Tech
- Operational: Care Coordinator, Medical Assistant, Reception
- System: Admin (manage saved views, exports, settings)

Core Workflows
--------------
- View All Tasks for a patient
- Create a task (clinical or operational follow-up)
- Accept / Claim a task
- Start, Pause (hold), Resume
- Complete with structured outcome (optionally create follow-up)
- Reassign to another clinician/team
- Defer (change due date with reason)
- Cancel with reason
- Reopen completed tasks (controlled)
- Manage dependencies and recurring rules
- Inspect task history, audit trail, and FHIR JSON

Design Principles
-----------------
- Patient-safety-first: display identity, allergies, and risk at top of page.
- Server-enforced authorization and patient-access checks for every API call.
- FHIR-first interoperability: map application workflow to FHIR Task and related resources.
- Auditability: all view and mutation events produce `AuditEvent` entries.
- Progressive enhancement: start with a mock-backed service then wire to Prisma DB and FHIR writes.
- Accessibility: WCAG 2.1 AA compliance for keyboard, screen readers, and color contrast.

Non-Functional Requirements
---------------------------
- Page shell visible within 800ms on warm cache; task summary within 1s for typical patient (≤200 tasks).
- Search/filter latency < 300ms for incremental queries (debounced).
- Mutations (create/assign/complete) return 200/201 within 500–800ms; optimistic UI with rollback on failure.
- Audit writes are fire-and-forget (do not block user flow) but must be recorded reliably on server.
- Concurrency-safe: optimistic concurrency tokens + SELECT FOR UPDATE patterns for critical transitions (dispense-like flows).

Security & Privacy
------------------
- Require `auth()` (NextAuth JWT session) server-side for all API handlers; use `requireActor()` pattern (see `ehr/src/notes/serverAuth.ts`).
- Verify patient access: server checks that user is assigned to practice/organization and has patient access.
- Server must validate `taskId` belongs to `patientId` in route handlers.
- Sensitive tasks: restrict visibility and actions by role; do not surface PHI in logs or exports unless permitted.
- Exports must be permission-checked and audited.

System Context Diagram (high level)
-----------------------------------
Patient Overview → Upcoming Tasks Card → Patient Tasks Route (/dashboard/records/:patientId/tasks)
  ↳ Next.js Route Handlers (/api/patients/:patientId/tasks → TaskService)
  ↳ Prisma/Postgres (Task + history + audit)
  ↳ FHIR Server (Task + related resources via `fhir-client`)
  ↳ Notification & Audit pipeline

Integration Points (existing)
------------------------------
- Patient overview and mock data: [ehr/src/app/dashboard/records/[id]/page.tsx](ehr/src/app/dashboard/records/[id]/page.tsx)
- Upcoming card: [ehr/src/components/patient-overview/UpcomingTasksCard.tsx](ehr/src/components/patient-overview/UpcomingTasksCard.tsx)
- FHIR client: [ehr/src/lib/fhir-client.ts](ehr/src/lib/fhir-client.ts)
- Audit helper: [ehr/src/lib/audit.ts](ehr/src/lib/audit.ts)
- Authentication & server session: [ehr/src/lib/auth.ts](ehr/src/lib/auth.ts)
- Patient banner pattern: [ehr/src/design-system/clinical/PatientBanner.tsx](ehr/src/design-system/clinical/PatientBanner.tsx)

Data Ownership
--------------
- PostgreSQL (Prisma) owns application workflow state, task history, auditEvent references, recurrence rules, and saved views.
- FHIR server owns the canonical interoperable `Task` representation when a task needs to be shared externally.
- Notifications, preferences, and exports are owned by application services (separate DB tables where applicable).

Route Architecture (HLD)
------------------------
UI Routes (React / Next.js App Router)
- `/dashboard/records/:patientId/tasks` — main tasks workspace (list + details panel)
- `/dashboard/records/:patientId/tasks/new` — create task modal/route
- `/dashboard/records/:patientId/tasks/:taskId` — deep-link to a selected task
- `/dashboard/records/:patientId/tasks/:taskId/history` — history view
- `/dashboard/records/:patientId/tasks/:taskId/audit` — audit view
- `/dashboard/records/:patientId/tasks/:taskId/fhir` — FHIR inspector

API Routes (Next.js Route Handlers)
- `GET  /api/patients/:patientId/tasks` — list (filters/pagination)
- `GET  /api/patients/:patientId/tasks/summary` — summary metrics
- `GET  /api/patients/:patientId/tasks/:taskId` — read
- `POST /api/patients/:patientId/tasks` — create
- `PATCH /api/patients/:patientId/tasks/:taskId` — partial update (title, priority, dueDate, notes)
- `POST /api/patients/:patientId/tasks/:taskId/accept` — accept
- `POST /api/patients/:patientId/tasks/:taskId/start` — start
- `POST /api/patients/:patientId/tasks/:taskId/complete` — complete
- `POST /api/patients/:patientId/tasks/:taskId/reassign` — reassign
- `POST /api/patients/:patientId/tasks/:taskId/defer` — defer
- `POST /api/patients/:patientId/tasks/:taskId/hold` — place on hold
- `POST /api/patients/:patientId/tasks/:taskId/resume` — resume
- `POST /api/patients/:patientId/tasks/:taskId/cancel` — cancel
- `POST /api/patients/:patientId/tasks/:taskId/reopen` — reopen
- `GET  /api/patients/:patientId/tasks/:taskId/history` — task history
- `GET  /api/patients/:patientId/tasks/:taskId/audit` — audit events (permissioned)
- `GET  /api/patients/:patientId/tasks/:taskId/fhir` — FHIR JSON bundle

Notes on Implementation Phasing
-------------------------------
- Phase 1 (Design + Mocks): implement UI pages and mock service (like `notes/service.mock.ts`) reusing `mockPatients` for initial preview.
- Phase 2 (API + DB): add Prisma schema + migrations for Task tables; implement Next.js route handlers with serverAuth, permission enforcement, and `withAudit` for key actions.
- Phase 3 (FHIR + Notifications): add FHIR `Task` creation/updates, notifications for reminders, and audit/provenance writes.
- Phase 4 (Hardening): tests, performance tuning, Sentry/metrics integration, and accessibility remediation.

Acceptance Criteria (summary)
-----------------------------
- The `/dashboard/records/:patientId/tasks` route loads with the correct patient banner and tasks summary.
- All server APIs enforce auth, patient access, and action-level permissions.
- Task actions produce audit events and maintain an immutable history.
- FHIR `Task` objects are created/updated on server when tasks are intended for cross-system workflows.
- UI supports list, details, filters, create/edit flows, and deep-linking.

Next Steps
----------
1. Produce Low-Level Design with data model (Prisma), API payload schemas, component map, state machine, and permission matrix (LLD).
2. Run structured design reviews per checklist and update HLD/LLD.
3. After design sign-off, implement Phase 1 mock-backed UI and add tests.

References
----------
- Patient Overview: `ehr/src/app/dashboard/records/[id]/page.tsx`
- Upcoming Tasks Card: `ehr/src/components/patient-overview/UpcomingTasksCard.tsx`
- FHIR client: `ehr/src/lib/fhir-client.ts`
- Audit helper: `ehr/src/lib/audit.ts`
- Notes feature (auth/permissions/service.mock): `ehr/src/notes`

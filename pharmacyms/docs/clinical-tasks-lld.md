# Clinical Tasks — Low Level Design (LLD)

Status: Draft — created by AI-assisted engineering agent
Date: 2026-08-01

This LLD provides implementation-level detail for engineers to implement the Clinical Tasks workspace.

1) Component Map (files and responsibility)
-------------------------------------------
- `src/app/dashboard/records/[id]/tasks/page.tsx` — Route entry. Server component: loads patient context and initial summary via server fetches; renders client shell.
- `src/components/tasks/PatientTasksPageShell.tsx` — Client shell providing layout, query hooks, and selection state.
- `src/components/tasks/PatientTasksBreadcrumbs.tsx` — Breadcrumb links and Back to Patient.
- `src/components/tasks/PatientTasksHeader.tsx` — Title, patient banner slot, actions (Create, Export, FHIR, Audit, Refresh).
- `src/components/tasks/PatientTaskSummaryGrid.tsx` — Summary metric cards (Open, Due Today, Overdue, Assigned to Me, High Priority).
- `src/components/tasks/PatientTaskTabs.tsx` — Accessible tab bar (All, Open, Due Today, Overdue, Mine, Unassigned, Completed, Cancelled).
- `src/components/tasks/PatientTaskToolbar.tsx` — Search, Quick filters, Advanced filters, Saved views controls.
- `src/components/tasks/list/PatientTaskList.tsx` — Table or virtualized list with `PatientTaskRow` components.
- `src/components/tasks/detail/PatientTaskDetailsPanel.tsx` — Sliding panel showing Overview / Context / Related / History / Audit / FHIR tabs.
- `src/components/tasks/modals/*.tsx` — CreateTaskDialog, EditTaskDialog, ConfirmCompleteDialog, ReassignDialog, HoldDialog, DeferDialog, CancelDialog, ReopenDialog, ConflictDialog.
- `src/hooks/usePatientTasks.ts` — Query hooks for list and summary.
- `src/services/patientTaskService.ts` — Client API wrapper implementing fetch calls to `/api/patients/:patientId/tasks`.

2) Hooks & Services
-------------------
- `usePatient(patientId)` — reuse existing patient loader where possible (server + client-safe hydration).
- `usePatientTaskSummary(patientId, filters)` — GET `/api/patients/:patientId/tasks/summary`.
- `usePatientTasks(patientId, query)` — GET `/api/patients/:patientId/tasks` with filters, pagination, sort.
- Mutation hooks: `useCreateTask`, `useUpdateTask`, `useStartTask`, `useCompleteTask`, etc. Use `swr` or `react-query` pattern for invalidation.

3) TypeScript models (src/types/tasks.ts)
-----------------------------------------
export type ClinicalTaskId = string;
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'draft' | 'requested' | 'received' | 'accepted' | 'ready' | 'in-progress' | 'on-hold' | 'failed' | 'completed' | 'cancelled' | 'entered-in-error';

export interface ClinicalTask {
  id: ClinicalTaskId;
  patientId: string;
  title: string;
  description?: string;
  category?: string; // code / display
  priority: TaskPriority;
  status: TaskStatus;
  businessStatus?: string;
  requesterId?: string;
  ownerId?: string; // current owning user or team
  assigneeId?: string; // clinician assigned
  relatedResource?: { resourceType: string; id: string } | null;
  startOn?: string | null; // ISO
  dueOn?: string | null; // ISO
  completedOn?: string | null; // ISO
  recurrence?: any | null;
  reminders?: any[];
  dependencies?: string[]; // task ids
  isBlocked?: boolean; // computed
  createdAt: string;
  createdBy: { id: string; name: string; role: string };
  updatedAt: string;
  revision?: number; // optimistic concurrency
}

4) Database schema (Prisma additions)
-------------------------------------
Add new models to `prisma/schema.prisma`:

```
model ClinicalTask {
  id            String   @id @default(cuid())
  patientId     String
  title         String
  description   String?  @db.Text
  category      String?
  priority      String   @default("normal")
  status        String   @default("requested")
  businessStatus String?
  requesterId   String?
  ownerId       String?
  assigneeId    String?
  relatedType   String?
  relatedId     String?
  startOn       DateTime?
  dueOn         DateTime?
  completedOn   DateTime?
  recurrence    Json?
  reminders     Json?
  dependencies  Json?    // array of ids
  isBlocked     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdById   String
  revised       Int      @default(1)
  deletedAt     DateTime?

  patient       Patient @relation(fields: [patientId], references: [id])
  @@index([patientId])
  @@index([assigneeId])
  @@map("clinical_tasks")
}

model ClinicalTaskHistory {
  id         String   @id @default(cuid())
  taskId     String
  action     String   // created, updated, assigned, completed, cancelled, reopened, status-change
  actorId    String
  actorRole  String
  detail     Json?
  createdAt  DateTime @default(now())
  task       ClinicalTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  @@index([taskId])
  @@map("clinical_task_history")
}
```

Notes:
- Keep `ClinicalTaskHistory` append-only; writes via application `withAudit` wrapper.
- Prevent cross-patient references by server validation: `relatedId` must reference a resource owned by `patientId`.

5) API Contracts (detailed)
---------------------------
- GET `/api/patients/:patientId/tasks?filter...` -> 200 { tasks: ClinicalTask[], total }
  - Query params: `status`, `assignee`, `priority`, `dueBefore`, `dueAfter`, `search`, `sort`, `page`, `pageSize`
  - Server: requireActor(); validate patient access; return paginated list.

- POST `/api/patients/:patientId/tasks` -> 201 { task }
  - Body: `title, description, category, priority, dueOn, startOn, assigneeId, relatedResource, recurrence, reminders`
  - Server: validate fields; verify assignee has access to patient; create ClinicalTask row and ClinicalTaskHistory entry; create FHIR Task async if required; withAudit() call.

- PATCH `/api/patients/:patientId/tasks/:taskId` -> 200 { task }
  - Body: partial fields; include `revision` for optimistic concurrency; server validates status transitions via state machine.

- POST `/api/patients/:patientId/tasks/:taskId/complete` -> 200 { task }
  - Body: `outcome, completionNote, followUpRequired, createFollowUpTask`.
  - Server: validate allowed transition (in-progress -> completed), record history, write audit, optionally create follow-up task & FHIR output.

- GET `/api/patients/:patientId/tasks/:taskId/fhir` -> 200 { bundle }
  - Requires `canView` permission; returns `Task` resource and related focus resources (ServiceRequest, Encounter, etc.).

Error model (shared)
```
{ code: "INVALID_REQUEST", message: "Title is required", fields?: { title: "required" }, correlationId?: "...", retryable?: false }
```
HTTP mappings: 400 (bad input), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (conflict/revision mismatch), 422 (invalid workflow transition), 500 (server error).

6) State Machine (server-enforced — using FHIR Task.status values)
-----------------------------------------------------------------
- Allowed statuses: `draft, requested, received, accepted, ready, in-progress, on-hold, failed, completed, cancelled, entered-in-error`.
- Transitions: see authoritative diagram in docs/flow-diagrams/clinical-tasks-state.png (attach later). Implement transition validation in server `taskService.validateTransition(current, requestedAction)`.
- Reopen: implement as creation of a new task linked by `dependencies`/`relatedId` to original, with a `reopenedFrom` field in history detail (safer than mutating completed row).

7) Permission Matrix (summary)
------------------------------
- DOCTOR: view/create/accept/start/complete/reassign/defer/hold/resume/reopen (most clinical actions)
- NURSE: view/create/start/complete (limited types), accept/resume for nurse-scoped tasks
- PHARMACIST: view/complete for medication-review tasks, reassign to pharmacists
- LAB_TECH: view/create/complete lab annotation tasks, finalize results
- RECEPTIONIST: create administrative tasks, reassign to care coordinator
- ADMIN: all actions + export/manage-saved-views
- PATIENT: none (Patient-facing task list is separate and read-only via a different API if enabled)

Concrete enforcement: server-side functions `canViewTask(actor, task)`, `canEditTask(actor, task)`, `canPerformAction(actor, task, action)` placed in `src/tasks/permissions.ts` and used in every route handler.

8) UI Interaction Patterns
--------------------------
- Primary list uses server-side rendering for initial load (server component reads summary) and client-side fetches for filter interactions.
- Use `react-virtual` (or simple pagination) for lists > 100 rows.
- Details panel opens from list row; data fetched lazily for history, audit, and FHIR tabs.
- Mutations use optimistic updates for quick UX; server returns canonical object which updates cache.
- Conflict handling: on 409 from server, open ConflictDialog showing diff and options (reload, keep local changes, merge).

9) Audit & Provenance
---------------------
- Every view (task read), CRUD action, and FHIR view triggers `logAuditEvent` (see `ehr/src/lib/audit.ts`).
- For key clinical actions (complete, cancel), additionally write `Provenance` entry referencing the FHIR Task and relevant resources.
- ClinicalTaskHistory is authoritative domain history (human-readable); AuditEvent is security/audit record.

10) Testing Strategy
--------------------
- Unit tests: permission functions, state machine, validation logic, FHIR mapping.
- Component tests: `PatientTaskList`, `PatientTaskDetailsPanel`, `CreateTaskDialog` using Jest/React Testing Library.
- Integration tests: API route handlers with mocked `prisma` (or test DB) verifying auth, transitions, and history writes.
- Playwright: e2e flows for primary clinical journeys (view tasks, create, assign, complete, reopen).

11) Observability
------------------
- Page load, query, and mutation durations instrumented via existing metrics system.
- Sentry captures server exceptions with non-PHI context.
- Export and permission-denied events emit audit and metric counters.

12) Accessibility & Internationalization
---------------------------------------
- Follow WCAG 2.1 AA; all interactive elements keyboard-accessible; visible focus states; status text in addition to color.
- Titles, labels, and messages localizable via existing i18n patterns.

13) Implementation Checklist (Phase 1 - Mocks)
----------------------------------------------
- [ ] Add route `src/app/dashboard/records/[id]/tasks/page.tsx` (server comp loads patient and summary)
- [ ] Add client shell and components directory `src/components/tasks/*`
- [ ] Add mock task service (`src/tasks/service.mock.ts`) and TypeScript models
- [ ] Wire UpcomingTasksCard footer to real route (already points to `/dashboard/records/${patient.id}/tasks`)
- [ ] Add basic UI for list + details panel (no DB yet)
- [ ] Add unit and component tests

14) Risk & Open Questions
-------------------------
- FHIR mapping complexity: which tasks must create `Task` resources? (open: policy)
- Export policy: what PHI is allowed in CSV/PDF? (legal requirement)
- Cross-patient references: if a related resource references a different patient, require authorized override.
- Recurrence model: how to represent expansions (store recurrence rule vs generate occurrences?)

Appendices
----------
- Reference implementations: `ehr/src/notes` (permissions, serverAuth, service.mock) are templates to reuse for tasks.
- FHIR client: `ehr/src/lib/fhir-client.ts` for server-side FHIR reads/writes.

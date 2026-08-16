# Clinical Tasks — High Level Design

Purpose: Provide a clinician-facing task management UI for tasks related to patients, lab results, messages, and administrative work.

Core components:
- `Sidebar` — global navigation and task count.
- `TopHeader` — search, filters, create task button.
- `SummaryCards` — top-level metrics (My Tasks, High Priority, Due Soon, Completed).
- `TaskList` — left column grouping tasks by Today/Tomorrow/This Week/Later.
- `TaskDetailPanel` — right column with task metadata, patient snapshot, abnormal results, notes, and activity timeline.

Data flow:
- Client requests tasks via `GET /api/tasks?patientId=...`.
- Creating a task calls `POST /api/tasks` and returns the created task id.
- Updates (status, assignment, notes) are sent to `PATCH /api/tasks/:id` with an `action` payload.

Persistence:
- Primary persistence is Prisma-backed PostgreSQL (`prisma.task`, `prisma.taskComment`, `prisma.taskActivity`).
- When `DATABASE_URL` is not configured, endpoints return or mutate in-memory mock data for local development.

Security:
- All API endpoints require authentication via `auth()` and record audit/activity events for traceability.

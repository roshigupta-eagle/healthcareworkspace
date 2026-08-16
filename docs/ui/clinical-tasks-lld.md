# Clinical Tasks — Low Level Design

API endpoints:
- `GET /api/tasks?patientId=` — returns tasks for a patient (includes comments, activities, assignee, patient relation).
- `POST /api/tasks` — creates a new task. Body: `{ title, patientId, assignedTo?, priority?, category?, dueAt? }`.
- `PATCH /api/tasks/:id` — updates a task. Body: `{ action: 'delegate'|'addNote'|'markComplete'|'update'|... }` with action-specific payload.

Client integration:
- `ClinicalTasksClient` (client component) accepts optional `patientId`. When provided, it fetches tasks from the API and performs optimistic updates on create/update.
- UI components live under `src/components/clinicalTasks/` and are pure presentational components, receiving props and callbacks from the client container.

Database:
- Prisma models: `Task`, `TaskComment`, `TaskActivity`, `TaskAssignment`, `TaskStatusHistory` (see `prisma/schema.prisma`).

Notes on deployment:
- Ensure `DATABASE_URL` is set in environment for API to persist to DB.
- Run `npx prisma migrate dev` to create migration and `npx prisma db push` when wiring locally.
